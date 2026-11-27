import { ref } from 'vue'

// Reorders a list by dragging, with the native drag and drop events. Items are told apart by the group they
// belong to and their index in it, and only move within their group. A drop is reported to onMove, which
// applies it, as the index the item had and the index it takes once taken out of its place.
export function useDragReorder ({ onMove }) {
    const dragged = ref(null)
    const target = ref(null)

    function reset () {
        dragged.value = null
        target.value = null
    }

    function handle (group, index) {
        return {
            onDragstart () {
                dragged.value = { group, index }
            },
            onDragend: reset
        }
    }

    function dropAt (group, index, event) {
        const box = event.currentTarget.getBoundingClientRect()
        return { group, index, after: event.clientY > box.top + box.height / 2 }
    }

    function row (group, index) {
        const here = target.value?.group === group && target.value.index === index
        return {
            class: {
                'ff-reorder--dragging': dragged.value?.group === group && dragged.value.index === index,
                'ff-reorder--before': here && !target.value.after,
                'ff-reorder--after': here && target.value.after
            },
            onDragover (event) {
                if (dragged.value?.group !== group) {
                    target.value = null
                    return
                }
                // Allows the drop
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                target.value = dropAt(group, index, event)
            },
            onDrop (event) {
                if (dragged.value?.group !== group) {
                    return
                }
                event.preventDefault()
                const from = dragged.value.index
                const slot = dropAt(group, index, event).after ? index + 1 : index
                const to = slot > from ? slot - 1 : slot
                reset()
                if (to !== from) {
                    onMove({ group, from, to })
                }
            }
        }
    }

    return { dragged, handle, row }
}
