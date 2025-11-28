<template>
    <div id="remote-instance-devices" class="flex-1 flex flex-col overflow-auto">
        <SectionTopMenu hero="Edge Devices" help-header="FlowFuse - Devices" info="A list of all edge devices registered to this instance.">
            <template #pictogram>
                <img src="../../images/pictograms/devices_red.png">
            </template>
            <template #helptext>
                <p>FlowFuse can be used to manage instances of Node-RED running on remote devices.</p>
                <p>Each device must run the <a href="https://flowfuse.com/docs/user/devices/" target="_blank">FlowFuse Device Agent</a>, which connects back to the platform to receive updates.</p>
                <p>Devices are registered to a Team, and assigned to an Application or an Instance.</p>
                <p>Flows can then be deployed remotely to the devices as an Instance Snapshot.</p>
            </template>
        </SectionTopMenu>
        <DevicesBrowser
            v-if="team"
            :team="team"
            :teamMembership="teamMembership"
            :instance="instance"
            @instance-updated="$emit('instance-updated', ...arguments)"
        />
    </div>
</template>

<script>
import { mapState } from 'vuex'

import DevicesBrowser from '../../components/DevicesBrowser.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

export default {
    name: 'InstanceRemoteInstances',
    components: {
        DevicesBrowser,
        SectionTopMenu
    },
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
