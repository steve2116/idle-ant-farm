import {defineStore} from 'pinia'
import {useAdventureStore} from './adventureStore'
import {useInventoryStore} from './inventoryStore'
import {del, get, set} from 'idb-keyval'

export const useGameStore = defineStore('gameStore', {
  state: () => ({
    loaded: false,
    larvae: 0,
    ants: 0,
    seeds: 10,
    queens: 1, // Initial queen
    lastSavedTime: Date.now(),

    // Resource caps
    maxSeeds: 1000, // Initial seed storage capacity
    maxLarvae: 10, // Initial larvae storage capacity

    // Initial resource caps
    initialMaxSeeds: 1000,
    initialMaxLarvae: 10,

    // Upgrade variables
    seedStorageUpgradeCost: 500, // Initial cost to upgrade seed storage
    larvaeStorageUpgradeCost: 100, // Initial cost to upgrade larvae storage

    // Balancing factors
    storageUpgradeFactor: 1.2, // How much each upgrade increases storage by (20%)
    upgradeCostFactor: 1.3, // How much each upgrade increases the cost by (30%)

    // Production rates and costs
    larvaeProductionRate: 1, // Larvae produced per queen per minute
    collectionRatePerAnt: 60, // Seeds collected per ant per minute
    seedCostPerLarva: 100, // Cost in seeds to create one larva
    seedCostPerAnt: 50, // Cost in seeds to create one ant
    larvaCostPerAnt: 1, // Cost in larvae to create one ant
    antCostPerQueen: 100, // Ants required to buy one queen
    seedCostPerQueen: 250, // Seeds required to buy one queen

    prestigePoints: 0, // New prestige currency
    purchasedUpgrades: [], // List of purchased prestige upgrades

    // Prestige-related upgrades
    prestigeShop: [
      {id: 'storageUpgrade', name: 'Storage Upgrade', description: 'Increase max storage by 20%', cost: 10},
      {id: 'productionBoost', name: 'Production Boost', description: 'Increase production speed by 20%', cost: 15},
      {id: 'queenEfficiency', name: 'Queen Efficiency', description: 'Queens produce 50% more larvae', cost: 20},
      // { id: 'autoLarvae', name: 'Auto Larvae Creation', description: 'Automatically create larvae based on seeds', cost: 25 },
      {id: 'betterAnts', name: 'Stronger Ants', description: 'Increase ant strength by 10%', cost: 100},
    ],

    // Prestige-related variables
    autoLarvaeCreation: false, // Auto-create larvae based on seeds

    // Adventure-related variables
    attackPerAnt: 2, // Attack value per ant
    healthPerAnt: 10, // Health value per ant
    defensePerAnt: 1, // Defense value per ant

    gameLoopInterval: null as ReturnType<typeof setInterval> | null,
  }),

  getters: {
    // Calculate larvae production per minute based on queens
    larvaePerMinute: (state) => state.queens * state.larvaeProductionRate,
    // Calculate larvae production per second for real-time updates
    larvaePerSecond: (state) => (state.queens * state.larvaeProductionRate) / 60,
    // Calculate seed production per second based on ants
    seedsPerSecond: (state) => (state.collectionRatePerAnt * state.ants) / 60,
  },

  actions: {
    // Function to create larvae using seeds, respecting the larvae cap
    createLarvae() {
      if (this.seeds >= this.seedCostPerLarva && this.larvae < this.maxLarvae) {
        this.larvae += 1
        this.seeds -= this.seedCostPerLarva
      } else {
        console.log('Not enough seeds to create larvae or larvae cap reached.')
      }
    },

    calculatePrestigePoints() {
      // Logarithmic scale for seeds with a minimum reward
      let pointsFromSeeds = Math.max(Math.floor(Math.log10(this.seeds + 1) / 2), 1) // Slow down seed contribution by dividing log result by 2
      if (pointsFromSeeds === 1) pointsFromSeeds = 0 // Minimum 1 point from seeds
      // Increase ant threshold to reward 1 point per 200 ants instead of 50 or 100
      const pointsFromAnts = Math.floor(this.ants / 200) // 1 point per 200 ants

      // Increase queen contribution to 10 points per queen after the first one
      const pointsFromQueens = Math.max((this.queens - 1) * 2, 0) // 2 points per extra queen after the first

      // Combine all points together
      return pointsFromSeeds + pointsFromAnts + pointsFromQueens
    },

    // Function to handle prestige/reset
    prestige() {
      const earnedPrestigePoints = this.calculatePrestigePoints()
      if (earnedPrestigePoints === 0) {
        console.log('Not enough resources to earn prestige points.')
        return
      }

      // Add earned prestige points to the total
      this.prestigePoints += earnedPrestigePoints

      // Reset game state except for prestige points and purchased upgrades
      this.resetGameState()

      console.log(`Prestige successful! You earned ${earnedPrestigePoints} prestige points.`)
    },

    // Buy an upgrade from the prestige shop
    buyUpgrade(upgradeId) {
      const upgrade = this.prestigeShop.find(u => u.id === upgradeId)

      if (upgrade && this.prestigePoints >= upgrade.cost) {
        this.prestigePoints -= upgrade.cost
        this.prestigeShop.find(u => u.id === upgradeId).cost *= 1.5 // Increase cost by 50%
        this.purchasedUpgrades.push(upgradeId)
        this.applyPrestigeUpgrade(upgradeId)
        console.log(`Purchased upgrade: ${upgrade.name}`)
      } else {
        console.log('Not enough prestige points or invalid upgrade.')
      }
    },

    // Apply a purchased upgrade
    applyPrestigeUpgrade(upgradeId) {
      if (upgradeId === 'storageUpgrade') {
        this.maxSeeds *= 1.2 // Increase seed storage
        this.maxLarvae *= 1.2 // Increase larvae storage
      } else if (upgradeId === 'productionBoost') {
        this.larvaeProductionRate *= 1.2
        this.collectionRatePerAnt *= 1.2
      } else if (upgradeId === 'queenEfficiency') {
        this.larvaeProductionRate *= 1.5
      } else if (upgradeId === 'autoLarvae') {
        this.autoLarvaeCreation = true
      } else if (upgradeId === 'betterAnts') {
        this.attackPerAnt *= 1.1
        this.setupAdventureStats()
      }
    },

    // Apply purchased upgrades to the game
    applyPrestigeUpgrades() {
      this.purchasedUpgrades.forEach(upgradeId => {
        this.applyPrestigeUpgrade(upgradeId)
      })
    },

    // Create max larvae based on available seeds and larvae cap
    createMaxLarvae() {
      const maxLarvaeToCreate = Math.min(Math.floor(this.seeds / this.seedCostPerLarva), this.maxLarvae - this.larvae)
      if (maxLarvaeToCreate > 0) {
        this.larvae += maxLarvaeToCreate
        this.seeds -= maxLarvaeToCreate * this.seedCostPerLarva
      }
    },

    // Function to create ants using larvae and seeds
    createAnts() {
      if (this.larvae >= this.larvaCostPerAnt && this.seeds >= this.seedCostPerAnt) {
        this.ants += 1
        this.larvae -= this.larvaCostPerAnt
        this.seeds -= this.seedCostPerAnt
      } else {
        console.log('Not enough larvae or seeds to create an ant.')
      }
    },

    // Create max ants based on available larvae and seeds
    createMaxAnts() {
      const maxAntsByLarvae = this.larvae
      const maxAntsBySeeds = Math.floor(this.seeds / this.seedCostPerAnt)
      const maxAntsToCreate = Math.min(maxAntsByLarvae, maxAntsBySeeds)
      if (maxAntsToCreate > 0) {
        this.larvae -= maxAntsToCreate * this.larvaCostPerAnt
        this.seeds -= maxAntsToCreate * this.seedCostPerAnt
        this.ants += maxAntsToCreate
      }
    },

    // Function to buy more queens
    buyQueen() {
      if (this.ants >= this.antCostPerQueen && this.seeds >= this.seedCostPerQueen) {
        this.queens += 1
        this.ants -= this.antCostPerQueen
        this.seeds -= this.seedCostPerQueen
      } else {
        console.log('Not enough ants or seeds to buy a queen.')
      }
    },

    // Buy max queens based on available ants and seeds
    buyMaxQueens() {
      const maxQueensByAnts = Math.floor(this.ants / this.antCostPerQueen)
      const maxQueensBySeeds = Math.floor(this.seeds / this.seedCostPerQueen)
      const maxQueensToBuy = Math.min(maxQueensByAnts, maxQueensBySeeds)
      if (maxQueensToBuy > 0) {
        this.ants -= maxQueensToBuy * this.antCostPerQueen
        this.seeds -= maxQueensToBuy * this.seedCostPerQueen
        this.queens += maxQueensToBuy
      }
    },

    // Collect seeds manually, but respect the seed cap
    collectSeedsManually(amount = 1) {
      const manualSeedCollectionRate = 10 // Number of seeds collected per click
      const seedsToAdd = Math.min(manualSeedCollectionRate, this.maxSeeds - this.seeds)
      if (amount > 0 && this.seeds + seedsToAdd <= this.maxSeeds) {
        this.seeds += amount
        return
      }

      this.seeds += seedsToAdd
    },

    // Function to upgrade seed storage
    upgradeSeedStorage() {
      if (this.seeds >= this.seedStorageUpgradeCost) {
        this.seeds -= this.seedStorageUpgradeCost

        // Increase storage by 20% of the current max
        this.maxSeeds = Math.floor(this.maxSeeds * this.storageUpgradeFactor)

        // Increase the upgrade cost by 30%
        this.seedStorageUpgradeCost = Math.floor(this.seedStorageUpgradeCost * this.upgradeCostFactor)
      } else {
        console.log('Not enough seeds to upgrade seed storage.')
      }
    },

    // Function to upgrade larvae storage
    upgradeLarvaeStorage() {
      if (this.seeds >= this.larvaeStorageUpgradeCost) {
        this.seeds -= this.larvaeStorageUpgradeCost

        // Increase storage by 20% of the current max
        this.maxLarvae = Math.floor(this.maxLarvae * this.storageUpgradeFactor)

        // Increase the upgrade cost by 30%
        this.larvaeStorageUpgradeCost = Math.floor(this.larvaeStorageUpgradeCost * this.upgradeCostFactor)
      } else {
        console.log('Not enough seeds to upgrade larvae storage.')
      }
    },

    // Calculate offline progress based on elapsed time and respect caps
    calculateOfflineProgress() {
      const currentTime = Date.now()
      const timeElapsed = (currentTime - this.lastSavedTime) / 60000 // Convert to minutes

      // Calculate how much should be produced while offline
      const larvaeProduced = Math.min(Math.floor(timeElapsed * this.larvaeProductionRate * this.queens), this.maxLarvae - this.larvae)
      const seedsCollected = Math.min(Math.floor(timeElapsed * this.collectionRatePerAnt * this.ants), this.maxSeeds - this.seeds)

      // Ensure you're not double-counting, by checking or resetting the lastSavedTime after progress is applied
      this.larvae += larvaeProduced
      this.seeds += seedsCollected

      // Update the last saved time to the current time after progress has been applied
      this.lastSavedTime = currentTime
    },


    // Start the game loop for real-time resource generation, respecting caps
    startGameLoop() {
      if (!this.gameLoopInterval) {
        this.gameLoopInterval = setInterval(() => {
          this.larvae = Math.min(this.larvae + this.larvaeProductionRate * this.queens / 60, this.maxLarvae)
          this.seeds = Math.min(this.seeds + (this.collectionRatePerAnt * this.ants) / 60, this.maxSeeds)

          if (this.autoLarvaeCreation) {
            this.createMaxLarvae()
          }
        }, 1000)
      }
    },

    // Stop the game loop
    stopGameLoop() {
      if (this.gameLoopInterval) {
        clearInterval(this.gameLoopInterval)
        this.gameLoopInterval = null
      }
    },

    // Save game state to IndexedDB
    async saveGameState() {
      const gameState = {
        ants: this.ants,
        seeds: this.seeds,
        queens: this.queens,
        larvae: this.larvae,
        maxSeeds: this.maxSeeds, // These will be recalculated on load
        maxLarvae: this.maxLarvae, // Recalculated on load
        seedStorageUpgradeCost: this.seedStorageUpgradeCost,
        larvaeStorageUpgradeCost: this.larvaeStorageUpgradeCost,
        prestigePoints: this.prestigePoints,
        purchasedUpgrades: this.purchasedUpgrades, // Save purchased upgrades

        lastSavedTime: Date.now(),

        // save prestige shop costs
        storagePrestigeCost: this.prestigeShop.find(u => u.id === 'storageUpgrade')?.cost ?? 10,
        productionPrestigeCost: this.prestigeShop.find(u => u.id === 'productionBoost')?.cost ?? 15,
        queenPrestigeCost: this.prestigeShop.find(u => u.id === 'queenEfficiency')?.cost ?? 20,
        autoLarvaePrestigeCost: this.prestigeShop.find(u => u.id === 'autoLarvae')?.cost ?? 25,
        betterAntsPrestigeCost: this.prestigeShop.find(u => u.id === 'betterAnts')?.cost ?? 100,

        // Save other store states
        attackPerAnt: this.attackPerAnt,
        healthPerAnt: this.healthPerAnt,
        defensePerAnt: this.defensePerAnt,
      }

      try {
        await set('idleGameState', JSON.parse(JSON.stringify(gameState)))
        console.log('Game state saved to IndexedDB')

        // Save other store states
        const inventoryStore = useInventoryStore()
        await inventoryStore.saveInventoryState()

        const adventureStore = useAdventureStore()
        await adventureStore.saveAdventureState()
      } catch (error) {
        console.error('Error saving game state:', error)
      }
    },

    // Load game state from IndexedDB and calculate offline progress
    async loadGameState() {
      try {
        const savedState = await get('idleGameState')
        if (savedState) {
          this.ants = savedState.ants ?? this.ants
          this.seeds = savedState.seeds ?? this.seeds
          this.queens = savedState.queens ?? this.queens
          this.larvae = savedState.larvae ?? this.larvae
          this.maxSeeds = savedState.maxSeeds ?? this.maxSeeds
          this.maxLarvae = savedState.maxLarvae ?? this.maxLarvae
          this.seedStorageUpgradeCost = savedState.seedStorageUpgradeCost ?? this.seedStorageUpgradeCost
          this.larvaeStorageUpgradeCost = savedState.larvaeStorageUpgradeCost ?? this.larvaeStorageUpgradeCost
          this.prestigePoints = savedState.prestigePoints ?? this.prestigePoints
          this.purchasedUpgrades = savedState.purchasedUpgrades ?? this.purchasedUpgrades

          this.lastSavedTime = savedState.lastSavedTime ?? this.lastSavedTime

          // Load prestige shop costs
          this.prestigeShop.map(shop => {
            if (shop.id === 'storageUpgrade') shop.cost = savedState.storagePrestigeCost
            if (shop.id === 'productionBoost') shop.cost = savedState.productionPrestigeCost
            if (shop.id === 'queenEfficiency') shop.cost = savedState.queenPrestigeCost
            if (shop.id === 'autoLarvae') shop.cost = savedState.autoLarvaePrestigeCost
            if (shop.id === 'betterAnts') shop.cost = savedState.betterAntsPrestigeCost
          })

          // Load other store states
          this.attackPerAnt = savedState.attackPerAnt ?? this.attackPerAnt
          this.healthPerAnt = savedState.healthPerAnt ?? this.healthPerAnt
          this.defensePerAnt = savedState.defensePerAnt ?? this.defensePerAnt

          console.log('Game state loaded from IndexedDB')

          // Load other store states
          const inventoryStore = useInventoryStore()
          await inventoryStore.loadInventoryState()

          const adventureStore = useAdventureStore()
          await adventureStore.loadAdventureState()
        }

        // Recalculate based on upgrades, apply offline progress
        this.calculateOfflineProgress()
        this.setupAdventureStats()
        this.loaded = true
      } catch (error) {
        console.error('Error loading game state:', error)
      }
    },

    // Reset the game state (excluding prestige-related data) and clear from IndexedDB
    async resetGameState(debug = false) {
      try {
        await del('idleGameState') // Clear IndexedDB entry
        this.larvae = 0
        this.ants = 0
        this.seeds = 10
        this.queens = 1
        this.maxSeeds = this.initialMaxSeeds
        this.maxLarvae = this.initialMaxLarvae
        this.seedStorageUpgradeCost = 500
        this.larvaeStorageUpgradeCost = 100
        this.lastSavedTime = Date.now()

        if (debug) {
          this.prestigePoints = 0
          this.purchasedUpgrades = []
        }

        this.healthPerAnt = 10
        this.attackPerAnt = 2
        this.defensePerAnt = 1

        // Reset other stores
        const inventoryStore = useInventoryStore()
        await inventoryStore.resetInventoryState()

        this.applyPrestigeUpgrades()

        const adventureStore = useAdventureStore()
        adventureStore.stopBattle()
        await adventureStore.resetAdventureState()
        console.log('Game reset and cleared from IndexedDB')
      } catch (error) {
        console.error('Error resetting game state:', error)
      }
    },

    setupAdventureStats() {
      const adventureStore = useAdventureStore()
      if (this.ants === 0) return
      adventureStore.armyMaxHealth = this.ants * this.healthPerAnt
      adventureStore.armyHealth = adventureStore.armyHealth ? Math.min(adventureStore.armyHealth, adventureStore.armyMaxHealth) : adventureStore.armyMaxHealth
      adventureStore.armyAttack = this.ants * this.attackPerAnt
      adventureStore.armyDefense = this.ants * this.defensePerAnt
    },


    formatNumber(num: number): string {
      num = Math.round(num)

      // Use normal formatting for numbers below 1 million
      if (num < 100e6) {
        if (num < 1000) return num.toFixed(0)

        const suffixes = ['', 'K', 'M']
        const exponent = Math.floor(Math.log10(Math.abs(num)) / 3)
        const scaledNumber = num / Math.pow(1000, exponent)
        return scaledNumber.toFixed(2) + suffixes[exponent]
      }

      // Use E notation for numbers 1 million and above
      return num.toExponential(2)
    },
  },
})
