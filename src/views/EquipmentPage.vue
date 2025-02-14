<!-- MainComponent.vue -->
<template>
  <div class="max-h-screen-3/4 overflow-hidden p-4 bg-gray-800 bg-opacity-75 rounded-lg shadow-lg relative flex flex-col">
    <h2 class="text-xl font-bold text-yellow-300 mb-4 text-center">
      Equip Your Ant Army
    </h2>

    <!-- Desktop Layout -->
    <div
      v-if="isDesktop"
      class="flex space-x-2"
    >
      <!-- Equipment Section -->
      <div class="flex-1">
        <EquipmentSectionComponent
          @start-drag-from-slot="startDragFromSlot"
          @drag-end="onDragEnd"
          @handle-drop="handleDrop"
          @double-click-unequip="handleDoubleClickUnequip"
          @show-context-menu="showContextMenu"
        />
      </div>

      <!-- Armor Effects Section -->
      <div class="flex-1">
        <ArmorEffectsComponent />
      </div>
    </div>

    <!-- Mobile Layout -->
    <div
      v-else
      class="flex-1 overflow-y-auto min-h-[260px]"
    >
      <!-- Equipment Section -->
      <EquipmentSectionComponent
        @start-drag-from-slot="startDragFromSlot"
        @drag-end="onDragEnd"
        @handle-drop="handleDrop"
        @double-click-unequip="handleDoubleClickUnequip"
        @show-context-menu="showContextMenu"
      />

      <!-- Collapsible Armor Effects Section -->
      <div class="mt-4">
        <button
          class="w-full bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center justify-between"
          @click="toggleArmorEffects"
        >
          <span>Armor Effects</span>
          <span v-if="showArmorEffects">▲</span>
          <span v-else>▼</span>
        </button>
        <div
          v-if="showArmorEffects"
          class="mt-2"
        >
          <ArmorEffectsComponent />
        </div>
      </div>
    </div>

    <div class="flex-1 mt-4 overflow-y-auto">
      <!-- Inventory Section -->
      <InventorySectionComponent
        @start-drag="startDrag"
        @drag-end="onDragEnd"
        @double-click-equip="handleDoubleClickEquip"
        @show-context-menu="showContextMenu"
        @handle-drop-into-inventory="handleDropIntoInventory"
      />
    </div>

    <!-- Context Menu -->
    <ContextMenuComponent
      :visible="contextMenu.visible"
      :item="contextMenu.item"
      :action="contextMenu.action"
      :slot-type="contextMenu.slotType"
      :index="contextMenu.index"
      :is-mobile="isMobile"
      :x="contextMenu.x"
      :y="contextMenu.y"
      @close="closeContextMenu"
      @equip="handleEquip"
      @unequip="handleUnequip"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import EquipmentSectionComponent from '../components/EquipmentSectionComponent.vue'
import InventorySectionComponent from '../components/InventorySectionComponent.vue'
import ContextMenuComponent from '../components/ContextMenuComponent.vue'
import ArmorEffectsComponent from '../components/ArmorEffectsComponent.vue'
import { useWindowSize } from '@vueuse/core'
import { useEquipmentStore } from '../stores/equipmentStore'
import { useInventoryStore } from '../stores/inventoryStore'

// Use stores
const equipmentStore = useEquipmentStore()
const inventoryStore = useInventoryStore()

// Get window width using @vueuse/core
const { width } = useWindowSize()

// Define a breakpoint for mobile devices (e.g., 640px)
const mobileBreakpoint = 640

// Determine if the device is mobile based on window width
const isMobile = computed(() => width.value < mobileBreakpoint)
const isDesktop = computed(() => !isMobile.value)

// State to control the visibility of the armor effects on mobile
const showArmorEffects = ref(false)

const toggleArmorEffects = () => {
  showArmorEffects.value = !showArmorEffects.value
}

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  item: null,
  slotType: '',
  index: null,
  action: '', // 'equip' or 'unequip'
})

// Drag and drop state
const draggedItem = ref<any>(null)
const dragOrigin = ref<any>(null)

// Logging function
const log = (...args: any[]) => {
  if (import.meta.env.MODE === 'development') {
    console.log(...args)
  }
}

// Handle dragging from inventory to equipment slots
const startDrag = (item: any, event: DragEvent) => {
  draggedItem.value = item
  dragOrigin.value = 'inventory'
  event.dataTransfer.setData('application/json', JSON.stringify(item))
}

// Handle dragging from equipment slots to inventory or other slots
const startDragFromSlot = (
  item: any,
  slotType: string,
  index: number | null,
  event: DragEvent,
) => {
  draggedItem.value = item
  if (slotType === 'accessory' && index !== null) {
    dragOrigin.value = { slotType, index }
  } else {
    dragOrigin.value = { slotType }
  }
  event.dataTransfer.setData('application/json', JSON.stringify(draggedItem.value))
}

// Handle dropping item into an equipment slot
const handleDrop = async (slotType: string, index: number | null, event: DragEvent) => {
  event.preventDefault()
  const itemData = event.dataTransfer.getData('application/json')
  const item = JSON.parse(itemData)

  if (item && item.slotType === slotType) {
    // Equip the item using the store method
    const success = await equipmentStore.equipItem(item, slotType, index)

    if (success) {
      // Remove item from inventory if it came from there
      if (dragOrigin.value === 'inventory') {
        await inventoryStore.removeItemFromInventory(item.id, 1)
      } else {
        // Unequip from previous slot
        if (dragOrigin.value.slotType) {
          await equipmentStore.unequipItem(dragOrigin.value.slotType, dragOrigin.value.index)
        }
      }
    }

    draggedItem.value = null
    dragOrigin.value = null
  }
}

// Handle dropping item back into the inventory
const handleDropIntoInventory = async (event: DragEvent) => {
  event.preventDefault()
  const itemData = event.dataTransfer.getData('application/json')
  const item = JSON.parse(itemData)

  if (item && dragOrigin.value !== 'inventory') {
    // Remove the item from the equipment slot using the store method
    await equipmentStore.unequipItem(dragOrigin.value.slotType, dragOrigin.value.index)

    // Add item back to inventory
    await inventoryStore.addItemToInventory({ id: item.id, amount: 1 })

    draggedItem.value = null
    dragOrigin.value = null
  }
}

// Handle drag end to reset state if drop was invalid
const onDragEnd = () => {
  draggedItem.value = null
  dragOrigin.value = null
}

// Handle double-click to equip from inventory
const handleDoubleClickEquip = async (item: any) => {
  // Determine the correct equipment slot based on the item's slotType
  let slotType = item.slotType
  let index = null

  // If it's an accessory, find the first empty accessory slot
  if (slotType === 'accessory') {
    const accessorySlots = equipmentStore.equippedItems.accessories
    const emptyIndex = accessorySlots.findIndex((slot) => slot === null)
    if (emptyIndex !== -1) {
      index = emptyIndex
    } else {
      alert('No empty accessory slots available.')
      return
    }
  }

  // Equip the item using the store method
  const success = await equipmentStore.equipItem(item, slotType, index)

  if (success) {
    log('Equipped item via double-click:', item)
  } else {
    alert('Cannot equip item.')
  }
}

// Handle double-click to unequip from equipment slot
const handleDoubleClickUnequip = (item: any, slotType: string, index: number | null) => {
  // Unequip the item using the store method
  equipmentStore.unequipItem(slotType, index)

  log('Unequipped item via double-click:', item)
}

// Show context menu
const showContextMenu = (item: any, slotType: string, index: number | null, event: MouseEvent) => {
  if (isDesktop.value) return

  event.preventDefault()

  contextMenu.value.visible = true
  contextMenu.value.slotType = slotType
  contextMenu.value.index = index

  if (slotType === 'inventory') {
    contextMenu.value.item = item
    contextMenu.value.action = 'equip'
  } else {
    contextMenu.value.item = item
    contextMenu.value.action = 'unequip'
  }
}

// Close context menu
const closeContextMenu = () => {
  contextMenu.value.visible = false
}

// Handle equip action from context menu
const handleEquip = async (item: any) => {
  // Determine the correct equipment slot based on the item's slotType
  let slotType = item.slotType
  let index = null

  // If it's an accessory, find the first empty accessory slot
  if (slotType === 'accessory') {
    const accessorySlots = equipmentStore.equippedItems.accessories
    const emptyIndex = accessorySlots.findIndex((slot) => slot === null)
    if (emptyIndex !== -1) {
      index = emptyIndex
    } else {
      alert('No empty accessory slots available.')
      closeContextMenu()
      return
    }
  }

  // Equip the item using the store method
  const success = await equipmentStore.equipItem(item, slotType, index)

  if (success) {
    // Remove from inventory
    await inventoryStore.removeItemFromInventory(item.id, 1)

    log('Equipped item:', item)
  } else {
    alert('Cannot equip item.')
  }

  closeContextMenu()
}

// Handle unequip action from context menu
const handleUnequip = (slotType: string, index: number | null) => {
  // Unequip the item using the store method
  equipmentStore.unequipItem(slotType, index)

  // Get the unequipped item
  let item = null
  if (slotType === 'accessory' && index !== null) {
    item = equipmentStore.equippedItems.accessories[index]
  } else {
    item = equipmentStore.equippedItems[slotType]
  }

  // Add back to inventory
  if (item) {
    inventoryStore.addItemToInventory({ id: item.id, amount: 1 })
    log('Unequipped item:', item)
  }
  closeContextMenu()
}
</script>

<style scoped>
/* Add any necessary styles here */
</style>
