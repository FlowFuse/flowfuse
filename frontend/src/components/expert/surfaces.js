// Values the 'expert-surface' injection can take besides the default drawer
export const EXPERT_SURFACES = Object.freeze({
    ONBOARDING: 'onboarding',
    BUILDING: 'building'
})

const FULL_PAGE_SURFACES = [EXPERT_SURFACES.ONBOARDING, EXPERT_SURFACES.BUILDING]

// Full page surfaces get the document style transcript instead of the drawer chat
export function isFullPageSurface (surface) {
    return FULL_PAGE_SURFACES.includes(surface)
}
