import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProductExpertInsightsAgentStore } from '@/stores/product-expert-insights-agent.js'

describe('useProductExpertInsightsAgentStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    describe('initial state', () => {
        it('has null context', () => {
            const store = useProductExpertInsightsAgentStore()
            expect(store.context).toBeNull()
        })

        it('has null sessionId', () => {
            const store = useProductExpertInsightsAgentStore()
            expect(store.sessionId).toBeNull()
        })

        it('has empty messages array', () => {
            const store = useProductExpertInsightsAgentStore()
            expect(store.messages).toEqual([])
        })

        it('has null sessionStartTime', () => {
            const store = useProductExpertInsightsAgentStore()
            expect(store.sessionStartTime).toBeNull()
        })

        it('has sessionWarningShown false', () => {
            const store = useProductExpertInsightsAgentStore()
            expect(store.sessionWarningShown).toBe(false)
        })

        it('has sessionExpiredShown false', () => {
            const store = useProductExpertInsightsAgentStore()
            expect(store.sessionExpiredShown).toBe(false)
        })

        it('has null abortController', () => {
            const store = useProductExpertInsightsAgentStore()
            expect(store.abortController).toBeNull()
        })

        it('has null sessionCheckTimer', () => {
            const store = useProductExpertInsightsAgentStore()
            expect(store.sessionCheckTimer).toBeNull()
        })
    })

    describe('setSessionCheckTimer', () => {
        it('stores the timer reference', () => {
            const store = useProductExpertInsightsAgentStore()
            const fakeTimer = setInterval(() => {}, 10000)
            store.setSessionCheckTimer(fakeTimer)
            expect(store.sessionCheckTimer).toBe(fakeTimer)
            clearInterval(fakeTimer)
        })

        it('replaces an existing timer', () => {
            const store = useProductExpertInsightsAgentStore()
            const timer1 = setInterval(() => {}, 10000)
            const timer2 = setInterval(() => {}, 10000)
            store.setSessionCheckTimer(timer1)
            store.setSessionCheckTimer(timer2)
            expect(store.sessionCheckTimer).toBe(timer2)
            clearInterval(timer1)
            clearInterval(timer2)
        })
    })

    describe('reset', () => {
        it('clears all state back to initial values', () => {
            const store = useProductExpertInsightsAgentStore()
            store.context = { instanceId: 'abc' }
            store.sessionId = 'session-123'
            store.messages = [{ role: 'user', content: 'hello' }]
            store.abortController = new AbortController()
            store.sessionStartTime = Date.now()
            store.sessionWarningShown = true
            store.sessionExpiredShown = true

            store.reset()

            expect(store.context).toBeNull()
            expect(store.sessionId).toBeNull()
            expect(store.messages).toEqual([])
            expect(store.abortController).toBeNull()
            expect(store.sessionStartTime).toBeNull()
            expect(store.sessionWarningShown).toBe(false)
            expect(store.sessionExpiredShown).toBe(false)
            expect(store.sessionCheckTimer).toBeNull()
        })

        it('calls clearInterval when a timer is active', () => {
            const store = useProductExpertInsightsAgentStore()
            const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
            const fakeTimer = setInterval(() => {}, 10000)
            store.setSessionCheckTimer(fakeTimer)

            store.reset()

            expect(clearIntervalSpy).toHaveBeenCalledWith(fakeTimer)
            clearIntervalSpy.mockRestore()
        })

        it('does not throw when no timer is set', () => {
            const store = useProductExpertInsightsAgentStore()
            expect(() => store.reset()).not.toThrow()
        })

        it('clears sessionCheckTimer after reset', () => {
            const store = useProductExpertInsightsAgentStore()
            const fakeTimer = setInterval(() => {}, 10000)
            store.setSessionCheckTimer(fakeTimer)

            store.reset()

            expect(store.sessionCheckTimer).toBeNull()
        })
    })

    describe('state mutations', () => {
        it('allows direct state assignment for context', () => {
            const store = useProductExpertInsightsAgentStore()
            store.context = { instanceId: 'test-id' }
            expect(store.context).toEqual({ instanceId: 'test-id' })
        })

        it('allows direct state assignment for sessionId', () => {
            const store = useProductExpertInsightsAgentStore()
            store.sessionId = 'abc-123'
            expect(store.sessionId).toBe('abc-123')
        })

        it('allows pushing to messages', () => {
            const store = useProductExpertInsightsAgentStore()
            store.messages.push({ role: 'user', content: 'hello' })
            store.messages.push({ role: 'assistant', content: 'hi' })
            expect(store.messages).toHaveLength(2)
        })

        it('allows setting sessionWarningShown', () => {
            const store = useProductExpertInsightsAgentStore()
            store.sessionWarningShown = true
            expect(store.sessionWarningShown).toBe(true)
        })

        it('allows setting sessionExpiredShown', () => {
            const store = useProductExpertInsightsAgentStore()
            store.sessionExpiredShown = true
            expect(store.sessionExpiredShown).toBe(true)
        })
    })
})
