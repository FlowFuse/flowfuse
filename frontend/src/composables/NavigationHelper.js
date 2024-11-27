import { useRouter } from 'vue-router'

export function useNavigationHelper () {
    const _router = useRouter()

    const openInANewTab = (href) => {
        return new Promise(resolve => {
            window.open(href, '_blank')
            resolve()
        })
    }

    const _isExternalLink = (href) => {
        try {
            const link = new URL(href, window.location.origin)

            return link.origin !== window.location.origin
        } catch {
            return false
        }
    }

    const navigateTo = (to, $event = null) => {
        const internalHref = _router.resolve(to).href
        const isMiddleButtonClick = $event?.button === 1
        const newTabKeyCombination = $event && ($event?.ctrlKey || $event.metaKey || isMiddleButtonClick)
        const isExternalLink = _isExternalLink(to)

        switch (true) {
        case isExternalLink && newTabKeyCombination:
            return openInANewTab(to)

        case isExternalLink:
            return navigateToExternal(to)

        case newTabKeyCombination:
            return openInANewTab(internalHref)

        default:
            return _router.push(to)
        }
    }

    const navigateToExternal = (href) => {
        return new Promise(resolve => {
            window.location.href = href
            resolve()
        })
    }

    return {
        openInANewTab,
        navigateTo,
        navigateToExternal
    }
}
