import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { redirectToOAuthClient } from '../../../../frontend/src/utils/oauthRedirect.ts'

describe('redirectToOAuthClient', () => {
    beforeEach(() => {
        vi.stubGlobal('window', { location: { href: 'https://app.example.com/account/request/abc' } })
    })
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    test('navigates to an http(s) callback', () => {
        redirectToOAuthClient('https://example.com/nr-assistant/auth/callback?code=abc')
        expect(window.location.href).toBe('https://example.com/nr-assistant/auth/callback?code=abc')
        redirectToOAuthClient('http://localhost:1880/flowfuse-nr-tools/auth/callback?code=abc')
        expect(window.location.href).toBe('http://localhost:1880/flowfuse-nr-tools/auth/callback?code=abc')
    })

    test('refuses a javascript: callback', () => {
        expect(() => redirectToOAuthClient('javascript:alert(document.domain)//x/nr-assistant/auth/callback?code=abc')).toThrow()
        expect(window.location.href).toBe('https://app.example.com/account/request/abc')
    })
})
