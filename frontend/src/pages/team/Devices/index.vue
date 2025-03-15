<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Remote Instances">
                <template #context>
                    FlowFuse provides infrastructure to manage your Node-RED Instances running remotely on your own hardware. These instances are managed using the <a class="ff-link" href="https://flowfuse.com/docs/user/devices/" target="_blank">FlowFuse Device Agent</a>.
                </template>
                <template #pictogram>
                    <img src="../../../images/pictograms/devices_red.png">
                </template>
                <template #helptext>
                    <p>FlowFuse can be used to manage instances of Node-RED running on remote hardware.</p>
                    <p>Each Remote Instance is managed through the <a href="https://flowfuse.com/docs/user/devices/" target="_blank">FlowFuse Device Agent</a>, which connects back to the platform to receive updates, and permits development of your flows, directly from FlowFuse.</p>
                    <p>Devices are registered to a Team, and assigned to an Application.</p>
                    <p>Flows can then be deployed remotely to the devices via Pipelines, or developed directly using "Developer Mode".</p>
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
