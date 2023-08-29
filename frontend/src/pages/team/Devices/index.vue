<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Devices">
                <template #context>
                    A list of all edge devices registered in your team. Assign them to application instances in order to deploy Node-RED remotely.
                </template>
                <template #pictogram>
                    <img src="../../../images/pictograms/devices_red.png">
                </template>
                <template #helptext>
                    <p>FlowFuse can be used to manage instances of Node-RED running on remote devices.</p>
                    <p>Each device must run the <a href="https://flowfuse.com/docs/user/devices/" target="_blank">FlowFuse Device Agent</a>, which connects back to the platform to receive updates.</p>
                    <p>Devices are registered to a Team, and assigned to an Instance within an Application.</p>
                    <p>Flows can then be deployed remotely to the devices as an Instance Snapshot.</p>
                </template>
            </ff-page-header>
        </template>
        <DevicesBrowser
            :team="team"
            :teamMembership="teamMembership"
        />
    </ff-page>
</template>

<script>
import DevicesBrowser from '../../../components/DevicesBrowser.vue'

import permissionsMixin from '../../../mixins/Permissions.js'

export default {
    name: 'TeamDevices',
    components: {
        DevicesBrowser
    },
    mixins: [permissionsMixin],
    props: {
        team: {
            type: Object,
            required: true
        },
        teamMembership: {
            type: Object,
            required: true
        }
    }
}
</script>
