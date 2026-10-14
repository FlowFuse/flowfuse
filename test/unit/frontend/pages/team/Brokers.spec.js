import { beforeEach, describe, expect, test, vi } from 'vitest'

import brokerAPI from '../../../../../frontend/src/api/broker.js'
import Brokers from '../../../../../frontend/src/pages/team/Brokers/index.vue'

vi.mock('../../../../../frontend/src/api/broker.js', () => ({
    default: { getBrokerStatus: vi.fn() }
}))

// getBrokerState only reads and writes a handful of fields, so it is called
// against a plain object rather than mounting the whole page
function brokerPage (activeBrokerId) {
    return { team: { id: 'team-1' }, activeBrokerId, brokerState: '', errorCode: '', loadingState: true }
}

describe('Brokers page broker state', () => {
    beforeEach(() => {
        brokerAPI.getBrokerStatus.mockReset()
    })

    test('a connected agent is connected', async () => {
        brokerAPI.getBrokerStatus.mockResolvedValue({ state: 'running', status: { connected: true, error: null } })
        const page = brokerPage('team-broker')

        await Brokers.methods.getBrokerState.call(page)

        expect(page.brokerState).toBe('connected')
        expect(page.errorCode).toBe('')
    })

    test('a team broker agent that is not collecting is not reported as a broker error', async () => {
        brokerAPI.getBrokerStatus.mockResolvedValue({ state: 'running', status: { connected: false, error: null } })
        const page = brokerPage('team-broker')

        await Brokers.methods.getBrokerState.call(page)

        expect(page.brokerState).toBe('suspended')
        expect(page.errorCode).toBe('')
    })

    test('a third-party broker agent that cannot connect is a broker error', async () => {
        brokerAPI.getBrokerStatus.mockResolvedValue({ state: 'running', status: { connected: false, error: null } })
        const page = brokerPage('broker-1')

        await Brokers.methods.getBrokerState.call(page)

        expect(page.brokerState).toBe('error')
        expect(page.errorCode).toBe('ENOTFOUND')
    })
})
