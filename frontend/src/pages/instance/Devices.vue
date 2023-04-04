<template>
    <SectionTopMenu hero="Devices" help-header="FlowForge - Devices" info="A list of all edge devices registered to this instance.">
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
        :instance="instance"
        @instance-updated="$emit('instance-updated', ...arguments)"
    />
</template>

<script>
import { mapState } from 'vuex'

import DevicesBrowser from '../../components/DevicesBrowser.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import permissionsMixin from '../../mixins/Permissions.js'

export default {
    name: 'InstanceRemoteInstances',
    components: {
        DevicesBrowser,
        SectionTopMenu
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    emits: ['instance-updated'],
    computed: {
        ...mapState('account', ['team', 'teamMembership'])
    }
}
</script>
