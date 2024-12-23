<template>
    <div>
        <SectionTopMenu hero="Edge Devices" help-header="Node-RED Edge Devices - Registered to FlowFuse" info="Manage remote instances of Node-RED running on your own hardware.">
            <template #pictogram>
                <img src="../../images/pictograms/devices_red.png">
            </template>
            <template #helptext>
                <p>FlowFuse can be used to manage instances of Node-RED running on remote devices.</p>
                <p>Each device must run the <a href="https://flowfuse.com/docs/user/devices/" target="_blank">FlowFuse Device Agent</a>, which connects back to the platform to receive updates.</p>
                <p>Devices are registered to a Team, and assigned to an Application or an Instance.</p>
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
