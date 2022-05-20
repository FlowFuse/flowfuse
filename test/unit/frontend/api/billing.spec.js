import { expect, vi } from 'vitest'

const mockGet = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))

vi.mock('@/api/client', () => {
    return {
        default: {
            get: mockGet
        }
    }
})

describe('Billing API', async () => {
    const BillingAPI = await import('@/api/billing')
    test('toCustomerPortal', () => {
        window.open = vi.fn()
        BillingAPI.default.toCustomerPortal()
        expect(window.open).toHaveBeenCalledOnce()
    })

    test('getSubscriptionInfo', () => {
        BillingAPI.default.getSubscriptionInfo()
        expect(mockGet).toHaveBeenCalledOnce()
    })
})
