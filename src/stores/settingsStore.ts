import {defineStore} from 'pinia'
import {useGameStore} from '@/stores/gameStore'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    showPrestigeWarning: true,
    autoThresholds: {
      // Thresholds for auto-creation of resources
      autoSeedStorageUpgrade: 0,
      autoLarvaeStorageUpgrade: 0,
      autoEliteAntsCreationSeeds: 0,
      autoEliteAntsCreationLarvae: 0,
      autoAntCreationLarvae: 0,
      autoAntCreationSeeds: 0,
      autoQueenCreationSeeds: 0,
      autoQueenCreationAnts: 0,
      autoCreateHousing: 0,
    },
  }),
  actions: {
    getSettingsState() {
      return {
        settings: this.$state,
      }
    },
    loadSettingsState(state) {
      this.$state = {
        ...state.settings,
      }

      this.setDefaults()
    },
    setDefaults() {
      this.showPrestigeWarning = this.showPrestigeWarning ?? true
      this.autoThresholds = {
          autoSeedStorageUpgrade: this.autoThresholds.autoSeedStorageUpgrade ?? 0,
          autoLarvaeStorageUpgrade: this.autoThresholds.autoLarvaeStorageUpgrade ?? 0,
          autoEliteAntsCreationSeeds: this.autoThresholds.autoEliteAntsCreationSeeds ?? 0,
          autoEliteAntsCreationLarvae: this.autoThresholds.autoEliteAntsCreationLarvae ?? 0,
          autoAntCreationLarvae: this.autoThresholds.autoAntCreationLarvae ?? 0,
          autoAntCreationSeeds: this.autoThresholds.autoAntCreationSeeds ?? 0,
          autoQueenCreationSeeds: this.autoThresholds.autoQueenCreationSeeds ?? 0,
          autoQueenCreationAnts: this.autoThresholds.autoQueenCreationAnts ?? 0,
          autoCreateHousing: this.autoThresholds.autoCreateHousing ?? 0,
      }
    },
  },
})
