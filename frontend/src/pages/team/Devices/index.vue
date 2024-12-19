<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Edge Devices">
                <template #context>
                    A list of all edge devices registered in your team. Assign them to applications or instances in order to deploy Node-RED remotely.
                </template>
                <template #pictogram>
                    <img src="../../../images/pictograms/devices_red.png">
                </template>
                <template #helptext>
                    <p>FlowFuse can be used to manage instances of Node-RED running on remote devices.</p>
                    <p>Each device must run the <a href="https://flowfuse.com/docs/user/devices/" target="_blank">FlowFuse Device Agent</a>, which connects back to the platform to receive updates.</p>
                    <p>Devices are registered to a Team, and assigned to an Application or an Instance.</p>
                    <p>Flows can then be deployed remotely to the devices as a Snapshot.</p>
                </template>
            </ff-page-header>
        </template>
        <DevicesBrowser />
    </ff-page>
</template>

<script>
import DevicesBrowser from '../../../components/DevicesBrowser.vue'

export default {
    name: 'TeamDevices',
    components: {
        DevicesBrowser
    }
}
</script>
