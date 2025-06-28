import { getCurrentInstance } from 'vue'

/**
 * Utility function to get translations in composition API or setup context
 * where $t might not be directly available
 */
export function useTranslation () {
    const instance = getCurrentInstance()
    if (!instance) {
        console.warn('useTranslation() called outside of Vue component context')
        return {
            t: (key) => key // fallback to returning the key
        }
    }

    const { $t } = instance.appContext.app.config.globalProperties
    return {
        t: $t || ((key) => key)
    }
}

/**
 * Auto-translate all elements with data-i18n attributes within a container
 * Useful for dynamically created content
 */
export function translateElements (container, t) {
    if (!container || !t) return

    const elements = container.querySelectorAll('[data-i18n]')
    elements.forEach(el => {
        const translationKey = el.getAttribute('data-i18n')
        if (translationKey) {
            const translatedText = t(translationKey)
            if (translatedText && translatedText !== translationKey) {
                el.textContent = translatedText
            }
        }
    })
}
