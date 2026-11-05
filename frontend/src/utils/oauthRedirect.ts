/**
 * Navigate the browser to the OAuth client callback url returned by the
 * platform. Only http(s) urls are followed, so a callback using a scheme such
 * as `javascript:` can never run in the FlowFuse origin.
 */
export function redirectToOAuthClient (redirect: string): void {
    const url = new URL(redirect)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Invalid redirect url')
    }
    window.location.href = url.toString()
}
