import {defineStore} from 'pinia'
import {useGameStore} from './gameStore'
import {useInventoryStore} from './inventoryStore'
import {useToast} from 'vue-toast-notification'


interface PrestigeShopItem {
  id: string
  name: string
  description: string
  cost: number
  oneTimePurchase?: boolean
  applyOnPrestige?: boolean
  category?: 'auto' | 'production' | 'storage' | 'combat' | 'expansion',
  unlockedWhen?: () => boolean // Function to determine if the upgrade is unlocked
}

export const usePrestigeStore = defineStore('prestige', {
  state: () => ({
    prestigePoints: 0, // New prestige currency
    timesPrestiged: 0, // Number of times prestiged
    purchasedUpgrades: [] as Array<string>, // List of purchased prestige upgrades
    prestigeShop: [
      // {
      //   id: 'autoLarvae',
      //   name: 'Auto Larvae Creation',
      //   description: 'Automatically create larvae based on seeds',
      //   cost: 10,
      //   oneTimePurchase: true,
      //   applyOnPrestige: true,
      //   category: 'auto',
      // },
      {
        id: 'autoAnts',
        name: 'Auto Ant Creation',
        description: 'Automatically create ants based on larvae and seeds',
        cost: 20,
        oneTimePurchase: true,
        applyOnPrestige: true,
        category: 'auto',
      },
      {
        id: 'autoQueens',
        name: 'Auto Queen Creation',
        description: 'Automatically create queens based on ants and seeds',
        cost: 20,
        oneTimePurchase: true,
        applyOnPrestige: true,
        category: 'auto',
      },
      {
        id: 'autoSeedStorageUpgrade',
        name: 'Auto Seed Storage Upgrade',
        description: 'Automatically upgrade seed storage',
        cost: 10,
        oneTimePurchase: true,
        applyOnPrestige: true,
        category: 'auto',
      },
      {
        id: 'autoEliteAntsCreation',
        name: 'Auto Elite Ants Creation',
        description: 'Automatically create elite ants based on ants and seeds',
        cost: 100,
        oneTimePurchase: true,
        applyOnPrestige: true,
        category: 'auto',
        unlockedWhen: () => {
          return usePrestigeStore().upgradePurchased('eliteAnts')
        },
      },
      {
        id: 'betterAnts',
        name: 'Stronger Ants',
        description: 'Increase ants army strength by 10%',
        cost: 50,
        applyOnPrestige: false,
        category: 'combat',
      },
      {
        id: 'betterAntsDefense',
        name: 'Stronger Ants Defense',
        description: 'Increase ants army defense by 10%',
        cost: 50,
        applyOnPrestige: false,
        category: 'combat',
      },
      {
        id: 'startWithAnts',
        name: 'Start with Ants',
        description: 'Start the game with ants!',
        cost: 15,
        applyOnPrestige: true,
        category: 'expansion',
      },
      {
        id: 'eliteAnts',
        name: 'Elite Ants',
        description: 'Unlock elite ants',
        cost: 500,
        applyOnPrestige: true,
        oneTimePurchase: true,
        category: 'expansion',
        unlockedWhen: () => {
          return usePrestigeStore().timesPrestiged >= 5
        },
      },
      {
        id: 'storageUpgrade',
        name: 'Storage Upgrade',
        description: 'Increase seed and larvae storage by 20% <br> Increase ant storage by 100% and queen storage by 1',
        cost: 5,
        category: 'storage',
        applyOnPrestige: true,
      },
      {
        id: 'eliteAntsStoreUpgrade',
        name: 'Elite Ants Store Upgrade',
        description: 'Increase the amount of elite ants you can store by 1',
        cost: 100,
        applyOnPrestige: true,
        category: 'storage',
        unlockedWhen: () => {
          return usePrestigeStore().upgradePurchased('eliteAnts')
        },
      },
      {
        id: 'productionBoost',
        name: 'Production Boost',
        description: 'Increase production speed by 20%',
        cost: 10,
        category: 'production',
      },
      {
        id: 'queenEfficiency',
        name: 'Queen Efficiency',
        description: 'Queens produce 50% more larvae',
        cost: 15,
        category: 'production',
      },
      {
        id: 'royalJelly',
        name: 'Royal Jelly',
        description: 'Queens will have a chance to produce royal jelly',
        cost: 1000,
        category: 'expansion',
        applyOnPrestige: true,
        oneTimePurchase: true,
        unlockedWhen: () => {
          return usePrestigeStore().upgradePurchased('eliteAnts')
        },
      },
      {
        id: 'tunnels',
        name: 'Tunnels',
        description: 'Unlock the tunnel system for exploration',
        cost: 500,
        category: 'expansion',
        applyOnPrestige: true,
        oneTimePurchase: true,
      },
    ] as PrestigeShopItem[], // List of items in the prestige shop

    // Prestige-related variables
    autoLarvaeCreation: false, // Auto-create larvae based on seeds
    autoAntCreation: false, // Auto-create ants based on larvae and seeds
    autoEliteAntsCreation: false, // Auto-create elite ants based on ants and seeds
    autoQueenCreation: false, // Auto-create queens based on ants and seeds
    autoSeedStorageUpgrade: false, // Auto-upgrade seed storage

    antsFromPrestigeShop: 0, // Ants from the prestige shop

    baseAntThreshold: 50,
    baseQueenThreshold: 2,
  }),
  getters: {
    upgradePurchased: (state) => (upgradeId: string) => state.purchasedUpgrades.includes(upgradeId),
    amountOfUpgrade: (state) => (upgradeId: string) => state.purchasedUpgrades.filter(id => id === upgradeId).length,
  },
  actions: {
    calculatePrestigePoints() {
      const gameStore = useGameStore()

      // Get current ants and queens from the game store
      const ants = gameStore.resources.ants
      const queens = gameStore.resources.queens

      // Calculate prestige points using adjusted logic
      const antPoints = this.calculatePrestigePointsFor(ants, this.baseAntThreshold, this.timesPrestiged)
      const queenPoints = this.calculatePrestigePointsFor(queens, this.baseQueenThreshold, this.timesPrestiged, false)

      // Total prestige points is the sum of ant and queen points
      return antPoints + queenPoints
    },

    calculatePrestigePointsFor(currentResources: number, baseThreshold: number, prestigeCount: number, scaling = true) {
      // Adjust scaling factor for prestige thresholds
      let scalingFactor = 1 + (prestigeCount * 0.2) // Scales gradually as prestiges increase
      if (prestigeCount < 5 || !scaling) scalingFactor = 1 // Scales faster for first 5 prestiges (optional

      const threshold = baseThreshold * scalingFactor

      // Ensure resources are above the threshold to earn prestige points
      if (currentResources < threshold) {
        return 0 // No prestige points if resources are below the threshold
      }

      // For the first prestige, give enough points to allow for the first upgrade
      if (prestigeCount <= 5 || !scaling) {
        return Math.floor(currentResources / threshold) + 1 // Ensure at least 5 points can be earned
      }

      // Use a hybrid scaling system for subsequent prestiges
      const prestigePoints = Math.floor((currentResources / threshold) * (1 + prestigeCount * 0.05)) // Slow scaling after prestige 1

      // Ensure points don’t drop below 0
      return prestigePoints > 0 ? prestigePoints : 0
    },

    // Function to handle prestige/reset
    async prestige() {
      const gameStore = useGameStore()
      const inventoryStore = useInventoryStore()
      try {
        const userId = await gameStore.getUserId()
        if (!userId) {
          console.error('User ID not found')
          return
        }

        // Calculate the earned prestige points
        const earnedPrestigePoints = this.calculatePrestigePoints()
        if (earnedPrestigePoints === 0) {
          console.log('Not enough resources to earn prestige points.')
          return
        }

        // Add earned prestige points
        this.prestigePoints += earnedPrestigePoints
        this.timesPrestiged += 1

        if (this.timesPrestiged === 5) {
          const $toast = useToast()
          $toast.info('You have unlocked the Elite Ants upgrade in the prestige shop!')
        }

        // Reset the game state for prestige without deleting the Firestore doc
        await gameStore.resetLocalGameState({isDebug: false})

        await gameStore.resetOtherStores(false)
        inventoryStore.applyPassiveEffects()  // Apply passive effects from inventory items

        // Save the updated state to Firestore
        await gameStore.saveGameState()
        console.log(`Prestige successful! You earned ${earnedPrestigePoints} prestige points.`)
      } catch (error) {
        console.error('Error during prestige:', error)
      }
    },
    // Buy an upgrade from the prestige shop
    buyUpgrade(upgradeId: string): boolean {
      const upgrade = this.prestigeShop.find(u => u.id === upgradeId)

      if (upgrade && this.prestigePoints >= upgrade.cost) {
        this.prestigePoints -= upgrade.cost
        let defaultCostMultiplier = 1.5
        switch (upgrade.id) {
          case 'eliteAntsStoreUpgrade':
            defaultCostMultiplier = 3
            break
        }

        upgrade.cost *= defaultCostMultiplier
        upgrade.cost = Math.floor(upgrade.cost) // Round down to the nearest integer

        this.purchasedUpgrades.push(upgradeId)
        this.applyPrestigeUpgrade(upgradeId)

        console.log(`Purchased upgrade: ${upgrade.name}`)
        return true
      } else {
        console.log('Not enough prestige points or invalid upgrade.')
      }

      return false
    },
    // Buy max upgrades based on available prestige points
    buyMaxUpgrade(upgradeId: string): boolean {
      const upgrade = this.prestigeShop.find(u => u.id === upgradeId)
      if (!upgrade) {
        console.log('Invalid upgrade.')
        return false
      }

      // Keep buying the upgrade until you can't afford the next one
      while (this.prestigePoints >= upgrade.cost) {
        this.prestigePoints -= upgrade.cost
        this.purchasedUpgrades.push(upgradeId)
        this.applyPrestigeUpgrade(upgradeId)

        // Increase the cost for the next purchase
        upgrade.cost *= 1.5
        upgrade.cost = Math.floor(upgrade.cost) // Round down to the nearest integer
      }

      console.log(`Purchased max upgrades for: ${upgrade.name}`)
      return true
    },
    // Apply a purchased upgrade
    applyPrestigeUpgrade(upgradeId, fromPrestige = false) {
      const gameStore = useGameStore()
      console.log('Try to apply upgrade:', upgradeId, fromPrestige)
      const prestigeInShop = this.prestigeShop.find(u => u.id === upgradeId)
      console.log('Prestige in shop:', prestigeInShop)
      if (fromPrestige && prestigeInShop?.applyOnPrestige === false) {
        console.log('Upgrade not applicable for prestige purchase:', upgradeId)
        return
      }

      console.log('Applying upgrade:', upgradeId)
      // Object map for handling upgrade logic
      const upgrades = {
        storageUpgrade: () => {
          gameStore.storage.maxSeeds *= 1.2 // Increase seed storage
          gameStore.storage.maxLarvae *= 1.2 // Increase larvae storage
          gameStore.storage.maxAnts *= 2 // Increase ant storage
          gameStore.storage.maxQueens += 1 // Increase queen storage
        },
        eliteAntsStoreUpgrade: () => {
          gameStore.storage.maxEliteAnts +=1 // Increase elite ant storage
        },
        productionBoost: () => {
          gameStore.productionRates.larvaeProductionRate *= 1.2
          gameStore.productionRates.collectionRatePerAnt *= 1.2
        },
        queenEfficiency: () => {
          gameStore.productionRates.larvaeProductionRate *= 1.5
        },
        autoLarvae: () => {
          this.autoLarvaeCreation = true
        },
        autoEliteAntsCreation: () => {
          this.autoEliteAntsCreation = true
        },
        betterAnts: () => {
          gameStore.attackPerAnt *= 1.1
          gameStore.setupAdventureStats()
        },
        betterAntsDefense: () => {
          gameStore.defensePerAnt *= 1.1
          gameStore.setupAdventureStats()
        },
        autoAnts: () => {
          this.autoAntCreation = true
        },
        autoQueens: () => {
          this.autoQueenCreation = true
        },
        autoSeedStorageUpgrade: () => {
          this.autoSeedStorageUpgrade = true
        },
        startWithAnts: () => {
          gameStore.resources.ants += 1
          this.antsFromPrestigeShop += 1
        },
        eliteAnts: () => {
          gameStore.eliteAntsUnlocked = true
        },
        royalJelly: () => {
          gameStore.royalJellyUnlocked = true
        },
      }

      // Execute the appropriate upgrade or log an error if the upgrade ID is invalid
      if (upgrades[upgradeId]) {
        upgrades[upgradeId]()
      } else {
        console.log('Invalid upgrade ID:', upgradeId)
      }
    },


    // Apply purchased upgrades to the game
    applyPrestigeUpgrades(fromPrestige = false) {
      this.purchasedUpgrades.forEach(upgradeId => {
        this.applyPrestigeUpgrade(upgradeId, fromPrestige)
      })
    },

    getPrestigeState() {
      return {
        prestigePoints: this.prestigePoints,
        timesPrestiged: this.timesPrestiged,
        purchasedUpgrades: this.purchasedUpgrades,

        storagePrestigeCost: this.prestigeShop.find(u => u.id === 'storageUpgrade')?.cost ?? 5,
        eliteAntsStoreUpgradeCost: this.prestigeShop.find(u => u.id === 'eliteAntsStoreUpgrade')?.cost ?? 100,
        productionPrestigeCost: this.prestigeShop.find(u => u.id === 'productionBoost')?.cost ?? 10,
        queenPrestigeCost: this.prestigeShop.find(u => u.id === 'queenEfficiency')?.cost ?? 15,
        betterAntsPrestigeCost: this.prestigeShop.find(u => u.id === 'betterAnts')?.cost ?? 50,
        betterAntsDefensePrestigeCost: this.prestigeShop.find(u => u.id === 'betterAntsDefense')?.cost ?? 50,
        startWithAntsPrestigeCost: this.prestigeShop.find(u => u.id === 'startWithAnts')?.cost ?? 15,

        autoLarvaeCreation: this.autoLarvaeCreation,
        autoAntCreation: this.autoAntCreation,
        autoEliteAntsCreation: this.autoEliteAntsCreation,
        autoQueenCreation: this.autoQueenCreation,
        autoSeedStorageUpgrade: this.autoSeedStorageUpgrade,
        eliteAntsUnlocked: this.upgradePurchased('eliteAnts'),
        royalJellyUnlocked: this.upgradePurchased('royalJelly'),
      }
    },

    loadPrestigeState(savedState) {
      this.prestigePoints = savedState.prestigePoints ?? this.prestigePoints
      this.timesPrestiged = savedState.timesPrestiged ?? this.timesPrestiged
      this.purchasedUpgrades = savedState.purchasedUpgrades ?? this.purchasedUpgrades

      this.autoLarvaeCreation = savedState.autoLarvaeCreation ?? this.autoLarvaeCreation
      this.autoAntCreation = savedState.autoAntCreation ?? this.autoAntCreation
      this.autoQueenCreation = savedState.autoQueenCreation ?? this.autoQueenCreation
      this.autoSeedStorageUpgrade = savedState.autoSeedStorageUpgrade ?? this.autoSeedStorageUpgrade
      this.autoEliteAntsCreation = savedState.autoEliteAntsCreation ?? this.autoEliteAntsCreation

      // Load prestige shop costs
      this.prestigeShop.forEach(shop => {
        if (shop.id === 'storageUpgrade') shop.cost = savedState.storagePrestigeCost ?? 5
        if (shop.id === 'eliteAntsStoreUpgrade') shop.cost = savedState.eliteAntsStoreUpgradeCost ?? 100
        if (shop.id === 'productionBoost') shop.cost = savedState.productionPrestigeCost ?? 10
        if (shop.id === 'queenEfficiency') shop.cost = savedState.queenPrestigeCost ?? 15
        if (shop.id === 'betterAnts') shop.cost = savedState.betterAntsPrestigeCost ?? 50
        if (shop.id === 'betterAntsDefense') shop.cost = savedState.betterAntsDefensePrestigeCost ?? 50
        if (shop.id === 'startWithAnts') shop.cost = savedState.startWithAntsPrestigeCost ?? 15
      })
    },

    resetPrestigeShopCosts() {
      this.prestigeShop.forEach(shop => {
        if (shop.id === 'storageUpgrade') shop.cost = 5
        if (shop.id === 'eliteAntsStoreUpgrade') shop.cost = 100
        if (shop.id === 'productionBoost') shop.cost = 10
        if (shop.id === 'queenEfficiency') shop.cost = 15
        if (shop.id === 'autoLarvae') shop.cost = 10
        if (shop.id === 'betterAnts') shop.cost = 50
        if (shop.id === 'betterAntsDefense') shop.cost = 50
        if (shop.id === 'autoAnts') shop.cost = 20
        if (shop.id === 'autoQueens') shop.cost = 20
        if (shop.id === 'startWithAnts') shop.cost = 15
        if (shop.id === 'eliteAnts') shop.cost = 500
        if (shop.id === 'autoSeedStorageUpgrade') shop.cost = 10
        if (shop.id === 'autoEliteAntsCreation') shop.cost = 100
        if (shop.id === 'royalJelly') shop.cost = 1000
      })
    },
  },
})
