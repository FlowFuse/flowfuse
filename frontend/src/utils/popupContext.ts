export function isPopupContext (query: Record<string, unknown> = {}): boolean {
    return query.context === 'popup'
}

export function handoffFromPopup (path = '/'): void {
    const target = new URL(path, window.location.origin).href
    if (window.opener && !window.opener.closed) {
        window.opener.location.href = target
        window.opener.focus()
        window.close()
    } else {
        window.location.href = target
    }
}
