<template>
    <SectionTopMenu hero="Devices" help-header="FlowForge - Devices" info="A list of all edge devices registered in your team. Assign them to application instances in order to deploy Node-RED remotely.">
        <template #helptext>
            <p>FlowForge can be used to manage instances of Node-RED running on remote devices.</p>
            <p>Each device must run the <a href="https://flowforge.com/docs/user/devices/" target="_blank">FlowForge Device Agent</a>, which connects back to the platform to receive updates.</p>
            <p>Devices are registered to a Team, and assigned to an Instance within an Application.</p>
            <p>Flows can then be deployed remotely to the devices as an Instance Snapshot.</p>
        </template>
    </SectionTopMenu>

    <DevicesBrowser
        :team="team"
        :teamMembership="teamMembership"
    />
</template>

<script>
import DevicesBrowser from '../../../components/DevicesBrowser'

import SectionTopMenu from '../../../components/SectionTopMenu'
import permissionsMixin from '../../../mixins/Permissions'

export default {
    name: 'TeamDevices',
    components: {
        SectionTopMenu,
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
