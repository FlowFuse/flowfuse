<template>
    <div>
        <SectionTopMenu hero="Remote Instances" help-header="Remote Instances - Registered to FlowFuse" info="Manage remote instances of Node-RED running on your own hardware, managed with the FlowFuse Device Agent.">
            <template #pictogram>
                <img src="../../images/pictograms/devices_red.png">
            </template>
            <template #helptext>
                <p>FlowFuse can be used to manage instances of Node-RED running on remote hardware.</p>
                <p>Each Remote Instance is managed with the <a href="https://flowfuse.com/docs/user/devices/" target="_blank">FlowFuse Device Agent</a>, which connects back to the platform to receive updates.</p>
                <p>Remote Instances are registered to a Team, and assigned to an Application.</p>
            </template>
        </SectionTopMenu>

        <DevicesBrowser :application="application" />
    </div>
</template>

<script>
import DevicesBrowser from '../../components/DevicesBrowser.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

export default {
    name: 'ApplicationDevices',
    components: {
        DevicesBrowser,
        SectionTopMenu
    },
    props: {
        application: {
            type: Object,
            required: true
        }
    }
}
</script>
