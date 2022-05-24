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
    const teamid = 'teamid'
    test('toCustomerPortal', () => {
        window.open = vi.fn()
        BillingAPI.default.toCustomerPortal(teamid)
        expect(window.open).toHaveBeenCalledOnce()
        expect(window.open).toHaveBeenCalledWith('/ee/billing/teams/' + teamid + '/customer-portal', '_blank')
    })

    test('getSubscriptionInfo', () => {
        BillingAPI.default.getSubscriptionInfo(teamid)
        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith('/ee/billing/teams/' + teamid)
    })
})
