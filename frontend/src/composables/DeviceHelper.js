import semver from 'semver'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

import deviceApi from '../api/devices.js'
import Alerts from '../services/alerts.js'
import Dialog from '../services/dialog.js'
import { DeviceStateMutator } from '../utils/DeviceStateMutator.js'
import { createPollTimer } from '../utils/timers.js'

// constants
const POLL_TIME = 5000
const deviceTransitionStates = [
    'loading',
    'installing',
    'starting',
    'stopping',
    'restarting',
    'suspending',
    'importing'
]

export function useDeviceHelper () {
    const $store = useStore()
    const $router = useRouter()

    let deviceStateMutator = null
    const device = ref(null)
    const pollTimer = createPollTimer(onPoll, POLL_TIME, false)

    // duplicated functionality because the pollTimer is not reactive
    const isPolling = ref(false)

    const isInTransitionState = computed(() => deviceTransitionStates.includes(device.value.status))

    const agentSupportsDeviceAccess = computed(() =>
        device.value?.agentVersion && semver.gte(device.value?.agentVersion, '0.8.0')
    )
    const agentSupportsActions = computed(() =>
        device.value?.agentVersion && semver.gte(device.value?.agentVersion, '2.3.0')
    )

    function startPolling () {
        isPolling.value = true
        pollTimer.start()
    }

    function stopPolling () {
        isPolling.value = false
        pollTimer.stop()
    }

    function resumePolling () {
        isPolling.value = true
        pollTimer.resume()
    }

    function pausePolling () {
        isPolling.value = false
        pollTimer.pause()
    }

    async function onPoll () {
        try {
            return await fetchDevice()
        } catch (err) {
            if (err.response?.status === 404) {
                stopPolling()
            }
            throw err
        }
    }

    function preActionChecks (message) {
        if (device.value.agentVersion && !agentSupportsActions.value) {
            // if agent version is present but is less than required version, show warning and halt
            Alerts.emit('Device Agent V2.3 or greater is required to perform this action.', 'warning')
            return false
        }
        if (!message) {
            // no message means silent operation, no need to show confirmation
            return true
        }
        if (!device.value?.agentVersion) {
            // if agent version is missing, be optimistic and give it a go, but show warning
            Alerts.emit(`${message}.  NOTE: The device agent version is not known, the action may timeout`, 'warning')
        } else {
            Alerts.emit(message, 'confirmation')
        }
        return true
    }

    async function restartDevice () {
        const preCheckOk = preActionChecks('Restarting device...')
        if (!preCheckOk) {
            return
        }

        deviceStateMutator.setStateOptimistically('restarting')

        try {
            await deviceApi.restartDevice(device.value)
            deviceStateMutator.setStateAsPendingFromServer()
        } catch (err) {
            let message = 'Device restart request failed.'
            if (err.response?.data?.error) {
                message = err.response.data.error
            }
            console.warn(message, err)
            Alerts.emit(message, 'warning')
        }
    }

    function bindDevice (binding, shouldStartPolling = false) {
        device.value = binding
        deviceStateMutator = new DeviceStateMutator(binding)
        if (shouldStartPolling) { startPolling() }
    }

    async function fetchDevice (deviceId = null) {
        try {
            device.value = await deviceApi.getDevice(deviceId || device.value?.id)
        } catch (err) {
            if (err.status === 403) {
                stopPolling()

                return $router.push({ name: 'device-overview' })
            }
        }
    }

    function showDeleteDialog () {
        Dialog.show({
            header: 'Delete Device',
            kind: 'danger',
            text: 'Are you sure you want to delete this device? Once deleted, there is no going back.',
            confirmLabel: 'Delete'
        }, async () => {
            try {
                await deviceApi.deleteDevice(device.value.id)
                Alerts.emit('Successfully deleted the device', 'confirmation')
                // Trigger a refresh of team info to resync following device changes
                await $store.dispatch('account/refreshTeam')
                await $router.push({ name: 'TeamDevices', params: { team_slug: $store.state.account.team.slug } })
            } catch (err) {
                Alerts.emit('Failed to delete device: ' + err.toString(), 'warning', 7500)
            }
        })
    }

    return {
        agentSupportsDeviceAccess,
        agentSupportsActions,
        device,
        isPolling,
        isInTransitionState,
        bindDevice,
        startPolling,
        stopPolling,
        pausePolling,
        resumePolling,
        restartDevice,
        fetchDevice,
        showDeleteDialog
    }
}
