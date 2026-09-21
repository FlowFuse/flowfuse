import SemVer from 'semver'

import { Maybe } from '@/types/common/types'

/** Either an instance (Node-RED version under `meta.versions['node-red']`)
 *  or a device (top-level `nodeRedVersion` field). */
interface IInstanceVersionProps {
    meta?: {
        versions?: Record<string, string | undefined>
    }
    nodeRedVersion?: string | null
}

export function isInstanceOnNR5Plus (target: Maybe<IInstanceVersionProps> | undefined): boolean {
    const nrVersion = target?.meta?.versions?.['node-red'] ?? target?.nodeRedVersion
    if (!nrVersion) {
        return false
    }
    return SemVer.satisfies(SemVer.coerce(nrVersion), '>=5.0.0')
}

export const MIN_DASHBOARD_LAUNCHER_VERSION = '2.33.0'

export function meetsMinLauncherVersion (target: Maybe<IInstanceVersionProps> | undefined, min: string): boolean {
    const launcher = target?.meta?.versions?.launcher
    const coerced = launcher ? SemVer.coerce(launcher) : null
    if (!coerced) {
        return true
    }
    return SemVer.gte(coerced, min)
}
