import { onBeforeUnmount, ref } from 'vue'

export default function useStreamingWords ({ delayMs = 30, splitRegex = /\s+/, joinWith = ' ' } = {}) {
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

        words = String(message).trim().split(splitRegex).filter(Boolean)
        index = 0
        isStreaming.value = true

        return new Promise((resolve) => {
            const tick = () => {
                if (!isStreaming.value) return resolve()

                if (index >= words.length) {
                    isStreaming.value = false
                    return resolve()
                }

                text.value += (text.value ? joinWith : '') + words[index]
                index += 1
                timer = setTimeout(tick, delayMs)
            }

            tick()
        })
    }

    onBeforeUnmount(stop)

    return { text, isStreaming, stream, stop }
}
