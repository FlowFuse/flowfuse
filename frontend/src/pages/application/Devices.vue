<template>
    <div data-el="application-devices">
        <SectionTopMenu :hero="$t('ui.remoteInstances')" :help-header="$t('ui.remoteInstancesRegisteredToFlowfuse')" :info="$t('ui.manageRemoteInstancesOfNodeRedRunningOnYourOwnHa')">
            <template #pictogram>
                <img src="../../images/pictograms/devices_red.png">
            </template>
            <template #helptext>
                <p>{{ $t('ui.flowfuseCanBeUsedToManageInstancesOfNodeRedRunni') }}</p>
                <p>{{ $t('ui.eachRemoteInstanceIsManagedWithThe') }} <a href="https://flowfuse.com/docs/user/devices/" target="_blank">{{ $t('ui.flowfuseDeviceAgent') }}</a>, which connects back to the platform to receive updates.</p>
                <p>{{ $t('ui.remoteInstancesAreRegisteredToATeamAndAssignedTo') }}</p>
            </template>
        </SectionTopMenu>

        <DevicesBrowser :application="application" />
    </div>
</template>

<script>
import DevicesBrowser from '../../components/DevicesBrowser.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

export default {
    name: 'application-devices',
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
