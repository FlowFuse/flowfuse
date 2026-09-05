<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.remoteInstances')">
                <template #context>
                    {{ $t('ui.flowfuseProvidesInfrastructureToManageYourNodeRe') }} <a class="ff-link" href="https://flowfuse.com/docs/user/devices/" target="_blank">{{ $t('ui.flowfuseDeviceAgent') }}</a>.
                </template>
                <template #pictogram>
                    <img src="../../../images/pictograms/devices_red.png">
                </template>
                <template #helptext>
                    <p>{{ $t('ui.flowfuseCanBeUsedToManageInstancesOfNodeRedRunni') }}</p>
                    <p>{{ $t('ui.eachRemoteInstanceIsManagedThroughThe') }} <a href="https://flowfuse.com/docs/user/devices/" target="_blank">{{ $t('ui.flowfuseDeviceAgent') }}</a>, which connects back to the platform to receive updates, and permits development of your flows, directly from FlowFuse.</p>
                    <p>{{ $t('ui.devicesAreRegisteredToATeamAndAssignedToAnApplic2') }}</p>
                    <p>{{ $t('ui.flowsCanThenBeDeployedRemotelyToTheDevicesViaPip') }}</p>
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
