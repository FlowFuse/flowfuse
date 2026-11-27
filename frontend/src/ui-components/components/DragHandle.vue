<template>
    <span class="ff-drag-handle" :title="label" draggable="true" data-el="ff-drag-handle" @dragstart="start" @dragend="emit('dragend', $event)">
        <Bars2Icon class="ff-icon-sm" aria-hidden="true" />
    </span>
</template>

<script setup>
import { Bars2Icon } from '@heroicons/vue/20/solid'

defineOptions({ name: 'ff-drag-handle' })

defineProps({
    label: {
        type: String,
        default: 'Drag to reorder'
    }
})
const emit = defineEmits(['dragstart', 'dragend'])

// What is dragged is the row the handle sits in, so that is what the pointer carries
function start (event) {
    const row = event.currentTarget.closest('tr, li')
    event.dataTransfer.effectAllowed = 'move'
    // Firefox starts no drag without data
    event.dataTransfer.setData('text/plain', '')
    if (row) {
        event.dataTransfer.setDragImage(row, 0, 0)
    }
    emit('dragstart', event)
}
</script>

<style lang="scss">
.ff-drag-handle {
    display: inline-flex;
    cursor: grab;
    color: var(--ff-color-text-subtle);

    &:hover {
        color: var(--ff-color-text);
    }
}

// Set on a row by useDragReorder. The line sits on the cells, as a row has no border of its own to colour.
.ff-reorder--dragging {
    opacity: 0.5;
}

.ff-reorder--before > td {
    box-shadow: inset 0 2px 0 var(--ff-color-accent);
}

.ff-reorder--after > td {
    box-shadow: inset 0 -2px 0 var(--ff-color-accent);
}
</style>
