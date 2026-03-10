import { ref } from 'vue'

import useTimerHelper from './TimerHelper.js'

export default function useStreamingList ({ intervalMs = 350, shallow = false } = {}) {
    const items = ref([])
    const visibleItems = ref([])
    const { doWhile } = useTimerHelper()

    async function addItemsSequentially (listItems = []) {
        items.value = shallow ? listItems.map(buildStreamableItem) : listItems
        await doWhile(
            () => items.value.length !== visibleItems.value.length,
            async () => {
                if (!Array.isArray(items.value) || items.value.length === 0) return

                const item = buildStreamableItem(items.value[visibleItems.value.length])
                const lastStep = getLastVisibleItem()

                const shouldAddNewItem = shallow
                    ? !!lastStep?.streamed
                    : Object.values(lastStep ?? {}).every(item => item.streamed)

                if (!lastStep) {
                    visibleItems.value.push(item)
                } else if (shouldAddNewItem) {
                    visibleItems.value.push(item)
                }
            },
            { intervalMs }
        )
    }

    function addItems (items) {
        items.value = items
        visibleItems.value = items.map(buildStreamableItem)
    }

    function getLastVisibleItem () {
        return visibleItems.value[visibleItems.value.length - 1]
    }

    function setSubItemStreamedState (itemKey, property) {
        if (shallow) {
            visibleItems.value[itemKey].streamed = true
            return
        }

        visibleItems.value[itemKey][property].streamed = true
    }

    function updateCardStreamingState (card, index) {
        Object.keys(card).forEach(key => {
            setSubItemStreamedState(index, key)
        })
    }

    function buildStreamableItem (source = {}) {
        if (shallow) {
            return { ...source, streamed: false }
        }

        return Object.fromEntries(
            Object.entries(source)
                .map(([key, value]) => [
                    key,
                    {
                        streamable: value,
                        streamed: false
                    }
                ])
        )
    }

    async function initStreamer (items, { shouldStream = false } = {}) {
        if (shouldStream) {
            await addItemsSequentially(items)
        } else {
            addItems(items)
            return Promise.resolve()
        }
    }

    return {
        addItemsSequentially,
        addItems,
        initStreamer,
        items,
        getLastVisibleItem,
        setSubItemStreamedState,
        updateCardStreamingState,
        visibleItems
    }
}
