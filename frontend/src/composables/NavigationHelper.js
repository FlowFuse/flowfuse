import { useRouter } from 'vue-router'

export function useNavigationHelper () {
    const _router = useRouter()

    const openInANewTab = (href) => {
        window.open(href, '_blank')
    }

    const navigateTo = (to, $event = null) => {
        const isMiddleButtonClick = $event?.button === 1

        if ($event && ($event?.ctrlKey || isMiddleButtonClick)) {
            openInANewTab(_router.resolve(to).href)
        } else {
            _router.push(to)
        }
    }

    return {
        openInANewTab,
        navigateTo
    }
}
