import type { RouteLocationNormalized } from 'vue-router'

import { Maybe } from '@/types/common/types'

interface IPageTitleMetadata {
    id?: Maybe<string>
    name?: Maybe<string>
}

interface IPageTitleContext {
    instance?: Maybe<IPageTitleMetadata>
    device?: Maybe<IPageTitleMetadata>
}

const SUFFIX = ' - FlowFuse'

function hasWordPrefix (title: string, word: string): boolean {
    return title === word || title.startsWith(word + ' ')
}

export function isEditorRoute (route: Maybe<RouteLocationNormalized>): boolean {
    const name = route?.name?.toString() ?? ''
    return name.startsWith('instance-editor') || name.startsWith('device-editor')
}

export function computePageTitle (
    route: Maybe<RouteLocationNormalized>,
    { instance, device }: IPageTitleContext
): string | null {
    const nearestWithTitle = route?.matched?.slice().reverse().find(r => (r.meta as { title?: string })?.title)
    if (!nearestWithTitle) return null

    let title = (nearestWithTitle.meta as { title: string }).title
    const routeName = route?.name?.toString() ?? ''
    const routeId = route?.params?.id

    if (routeName.startsWith('instance') &&
        instance?.id != null &&
        instance.id === routeId &&
        instance.name &&
        hasWordPrefix(title, 'Instance')) {
        title = `${instance.name}${title.slice('Instance'.length)}`
    } else if (routeName.startsWith('device') &&
        device?.id != null &&
        device.id === routeId &&
        device.name &&
        hasWordPrefix(title, 'Device')) {
        title = `${device.name}${title.slice('Device'.length)}`
    }

    return title + SUFFIX
}
