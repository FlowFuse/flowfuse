import { beforeEach, describe, expect, test, vi } from 'vitest'

import brokerAPI from '../../../../../frontend/src/api/broker.js'
import Brokers from '../../../../../frontend/src/pages/team/Brokers/index.vue'
import alerts from '../../../../../frontend/src/services/alerts.js'

vi.mock('../../../../../frontend/src/api/broker.js', () => ({
    default: { getBrokerStatus: vi.fn(), startBroker: vi.fn(), suspendBroker: vi.fn() }
}))
vi.mock('../../../../../frontend/src/services/alerts.js', () => ({
    default: { emit: vi.fn() }
}))

// getBrokerState only reads and writes a handful of fields, so it is called
// against a plain object rather than mounting the whole page
function brokerPage (activeBrokerId) {
    return {
        team: { id: 'team-1' },
        activeBrokerId,
        brokerState: '',
        errorCode: '',
        loadingState: true,
        startingSince: null,
        startingTimedOut: false,
        applyStartingState: Brokers.methods.applyStartingState,
        resetStartingTimeout: Brokers.methods.resetStartingTimeout
    }
}

describe('Brokers page broker state', () => {
    beforeEach(() => {
        brokerAPI.getBrokerStatus.mockReset()
        brokerAPI.startBroker.mockReset()
        brokerAPI.suspendBroker.mockReset()
        alerts.emit.mockReset()
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

    test('an agent that cannot be reached shows as starting while within the wait window', async () => {
        brokerAPI.getBrokerStatus.mockResolvedValue({ state: 'running', status: { connected: false, error: 'error_getting_status' } })
        const page = brokerPage('team-broker')

        await Brokers.methods.getBrokerState.call(page)

        expect(page.brokerState).toBe('starting')
        expect(page.startingTimedOut).toBe(false)
        expect(alerts.emit).not.toHaveBeenCalled()
    })

    test('an agent that stays unreachable past the wait window stops spinning, alerts once, and is retryable', async () => {
        brokerAPI.getBrokerStatus.mockResolvedValue({ state: 'running', status: { connected: false, error: 'error_getting_status' } })
        const page = brokerPage('team-broker')
        // Pretend it has been starting for longer than the timeout
        page.startingSince = Date.now() - 120000

        await Brokers.methods.getBrokerState.call(page)

        expect(page.brokerState).toBe('suspended')
        expect(page.startingTimedOut).toBe(true)
        expect(alerts.emit).toHaveBeenCalledTimes(1)

        // A further poll while still unreachable must not spin or alert again
        await Brokers.methods.getBrokerState.call(page)
        expect(page.brokerState).toBe('suspended')
        expect(alerts.emit).toHaveBeenCalledTimes(1)
    })

    test('a successful status clears the timed-out state', async () => {
        const page = brokerPage('team-broker')
        page.startingTimedOut = true
        page.startingSince = Date.now() - 120000
        brokerAPI.getBrokerStatus.mockResolvedValue({ state: 'running', status: { connected: true, error: null } })

        await Brokers.methods.getBrokerState.call(page)

        expect(page.brokerState).toBe('connected')
        expect(page.startingTimedOut).toBe(false)
        expect(page.startingSince).toBe(null)
    })

    test('the toggle retries a start after a timeout even though the backend row is still running', async () => {
        const page = brokerPage('broker-1')
        page.$route = { params: { brokerId: 'broker-1' } }
        page.startingTimedOut = true
        page.startingSince = Date.now() - 120000
        brokerAPI.getBrokerStatus.mockResolvedValue({ state: 'running', status: { connected: false, error: 'error_getting_status' } })
        brokerAPI.startBroker.mockResolvedValue({})

        await Brokers.methods.toggleAgent.call(page)

        expect(brokerAPI.startBroker).toHaveBeenCalledTimes(1)
        expect(brokerAPI.suspendBroker).not.toHaveBeenCalled()
        expect(page.brokerState).toBe('starting')
        expect(page.startingTimedOut).toBe(false)
        expect(page.startingSince).toBe(null)
        expect(page.loadingState).toBe(false)
    })

    test('the toggle still suspends a running agent that has not timed out', async () => {
        const page = brokerPage('broker-1')
        page.$route = { params: { brokerId: 'broker-1' } }
        brokerAPI.getBrokerStatus.mockResolvedValue({ state: 'running', status: { connected: true, error: null } })
        brokerAPI.suspendBroker.mockResolvedValue({})

        await Brokers.methods.toggleAgent.call(page)

        expect(brokerAPI.suspendBroker).toHaveBeenCalledTimes(1)
        expect(brokerAPI.startBroker).not.toHaveBeenCalled()
        expect(page.brokerState).toBe('suspending')
    })
})
