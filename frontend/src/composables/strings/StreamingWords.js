import { nextTick, onBeforeUnmount, ref } from 'vue'

export default function useStreamingWords ({ delayMs = 30, wordsPerTick = 1 } = {}) {
    const text = ref('')
    const isStreaming = ref(false)

    let timer = null
    let words = []
    let index = 0

    const stop = () => {
        if (timer) clearTimeout(timer)
        timer = null
        isStreaming.value = false
        words = []
        index = 0
    }

    const stream = (message = '') => {
        stop()
        text.value = ''

        // Each word keeps the whitespace before it, so code indentation survives streaming
        words = String(message).trim().match(/\s*\S+/g) || []
        index = 0
        isStreaming.value = true

        return new Promise((resolve) => {
            const tick = async () => {
                if (!isStreaming.value) return resolve()

                if (index >= words.length) {
                    await nextTick()
                    isStreaming.value = false
                    return resolve()
                }

                text.value += words.slice(index, index + wordsPerTick).join('')
                index += wordsPerTick
                timer = setTimeout(tick, delayMs)
            }

            tick()
        })
    }

    onBeforeUnmount(stop)

    return { text, isStreaming, stream, stop }
}
