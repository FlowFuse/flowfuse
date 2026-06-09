export {}

declare global {
    interface Window {
        posthog?: any
        _hsq?: unknown[]
        _ffhstc?: string
        _ffLoadHubSpot?: () => void
        _ffLoadGoogleAnalytics?: () => void
    }
}
