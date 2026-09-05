<template>
    <div id="remote-instance-devices" class="flex-1 flex flex-col overflow-auto">
        <SectionTopMenu :hero="$t('ui.edgeDevices')" :help-header="$t('ui.flowfuseDevices')" :info="$t('ui.aListOfAllEdgeDevicesRegisteredToThisInstance')">
            <template #pictogram>
                <img src="../../images/pictograms/devices_red.png">
            </template>
            <template #helptext>
                <p>{{ $t('ui.flowfuseCanBeUsedToManageInstancesOfNodeRedRunni2') }}</p>
                <p>{{ $t('ui.eachDeviceMustRunThe') }} <a href="https://flowfuse.com/docs/user/devices/" target="_blank">{{ $t('ui.flowfuseDeviceAgent') }}</a>, which connects back to the platform to receive updates.</p>
                <p>{{ $t('ui.devicesAreRegisteredToATeamAndAssignedToAnApplic') }}</p>
                <p>{{ $t('ui.flowsCanThenBeDeployedRemotelyToTheDevicesAsAnIn') }}</p>
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
import { mapState } from 'pinia'

import DevicesBrowser from '../../components/DevicesBrowser.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import { useContextStore } from '@/stores/context.js'

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
        ...mapState(useContextStore, ['team', 'teamMembership'])
    }
}
</script>
