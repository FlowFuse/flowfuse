import { useRouter } from 'vue-router'

export function useNavigationHelper () {
    const _router = useRouter()

    const navigateTo = (to, $event = null) => {
        const isMiddleButtonClick = $event?.button === 1

        if ($event && ($event?.ctrlKey || isMiddleButtonClick)) {
            window.open(_router.resolve(to).href, '_blank')
        } else {
            _router.push(to)
        }
    }

    return {
        navigateTo
    }
}
