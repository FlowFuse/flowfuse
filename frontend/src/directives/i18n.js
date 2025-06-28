import { getCurrentInstance } from 'vue'

export default {
    name: 'i18n',
    mounted (el, binding, vnode) {
        const instance = getCurrentInstance()
        const { $t } = instance.appContext.app.config.globalProperties

        // Get translation key from data-i18n attribute
        const translationKey = el.getAttribute('data-i18n')

        if (translationKey) {
            // Store original content as fallback
            if (!el.dataset.originalContent) {
                el.dataset.originalContent = el.textContent
            }

            // Apply translation
            const translatedText = $t(translationKey)

            // Only update if translation exists and is different from key
            if (translatedText && translatedText !== translationKey) {
                el.textContent = translatedText
            }
        }
    },

    updated (el, binding, vnode) {
        // Re-apply translation on updates (e.g., locale changes)
        const instance = getCurrentInstance()
        const { $t } = instance.appContext.app.config.globalProperties

        const translationKey = el.getAttribute('data-i18n')

        if (translationKey) {
            const translatedText = $t(translationKey)

            if (translatedText && translatedText !== translationKey) {
                el.textContent = translatedText
            } else if (el.dataset.originalContent) {
                // Fallback to original content if translation not found
                el.textContent = el.dataset.originalContent
            }
        }
    }
}
