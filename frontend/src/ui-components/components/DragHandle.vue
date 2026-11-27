<template>
    <span class="ff-drag-handle" :aria-label="label" draggable="true" data-el="ff-drag-handle" @dragstart="start" @dragend="emit('dragend', $event)">
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
// The whole box around the icon is the handle: hit testing on the icon alone only finds its two bars, so the
// cursor flickers in the gap between them. The label is an aria-label rather than a title, as Chrome on macOS
// puts the arrow back while a title tooltip shows.
.ff-drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    margin: -0.25rem;
    border-radius: 0.25rem;
    cursor: grab;
    color: var(--ff-color-text-subtle);

    svg {
        pointer-events: none;
    }

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
