<template>
    <ff-loading v-if="updating" :message="$t('ui.updatingInstance')" />
    <template v-else>
        <FeatureUnavailableToTeam v-if="!haFeatureAvailable" />
        <FormHeading>{{ $t('ui.highAvailability') }}</FormHeading>
        <FormRow>
            <template #description>
                <p class="mb-3">
                    {{ $t('ui.highAvailabilityModeAllowsYouToRunMultipleCopies') }}
                </p>
                <p>
                    {{ $t('ui.thisFeatureIsCurrentlyFreeToUseButWillBecomeACha') }}
                </p>
                <p>
                    {{ $t('ui.whenHaModeIsEnabledTheFollowingRestrictionsApply') }}
                </p>
                <ul class="list-disc pl-6">
                    <li>{{ $t('ui.enablingOrDisablingHaModeRequiresARestartOfTheIn') }}</li>
                    <li>Flows cannot be directly modified in an HA Instance; the editor is disabled.</li>
                    <li>{{ $t('ui.aDevopsPipelineShouldBeCreatedToDeployNewFlowsTo') }}</li>
                    <li>{{ $t('ui.anyInternalStateOfTheFlowsIsNotSharedBetweenTheH') }}</li>
                </ul>
                <p>
                    {{ $t('ui.checkTheDocumentationForMoreInformationAbout') }} <a class="underline" href="https://flowfuse.com/docs/user/high-availability/">{{ $t('ui.highAvailability') }}</a>.
                </p>
            </template>
            <template #input>&nbsp;</template>
        </FormRow>
        <template v-if="!isHA">
            <ff-button :disabled="!haFeatureAvailable" kind="secondary" data-nav="enable-ha" @click="enableHA()">{{ $t('ui.enableHaMode') }}</ff-button>
        </template>
        <template v-else>
            <ff-button :disabled="!haFeatureAvailable" kind="secondary" data-nav="disable-ha" @click="disableHA()">{{ $t('ui.disableHaMode') }}</ff-button>
        </template>
    </template>
</template>

<script>
import { mapState } from 'pinia'

import InstanceApi from '../../../api/instances.js'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'
import usePermissions from '../../../composables/Permissions.js'
import { t } from '../../../i18n.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

import { useContextStore } from '@/stores/context.js'

export default {
    name: 'InstanceSettingsStages',
    components: {
        FormHeading,
        FormRow,
        FeatureUnavailableToTeam
    },
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'save-button-state'],
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data: function () {
        return {
            updating: false,
            saveButton: {
                visible: false,
                disabled: false
            }
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        isHA () {
            return this.instance?.ha?.replicas !== undefined
        },
        haFeatureAvailable () {
            const flag = this.team.type.properties.features?.ha
            return flag === undefined || flag
        }
    },
    watch: {
        saveButton: {
            immediate: true,
            handler: function (state) {
                this.$emit('save-button-state', state)
            }
        }
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        checkAccess: function () {
            if (!this.hasPermission('project:edit', { application: this.instance.application })) {
                this.$router.push({ replace: true, path: 'general' })
            }
        },
        async enableHA () {
            const msg = {
                header: t('ui.enableHighAvailabilityMode'),
                text: `Enabling HA mode will require a restart of the instance.
                       Once enabled, the editor will be disabled. The flows can only be updated by using a DevOps Pipeline to deploy to this instance from another one, or by disabling HA mode first.`
            }
            Dialog.show(msg, async () => {
                this.updating = true
                await InstanceApi.enableHAMode(this.instance.id)
                this.updating = false
                if (this.instance.meta?.state === 'suspended') {
                    Alerts.emit('High Availability mode enabled', 'confirmation')
                } else {
                    Alerts.emit('High Availability mode enabled. The Instance will now be restarted', 'confirmation')
                }
                this.$emit('instance-updated')
            })
        },
        async disableHA () {
            const msg = {
                header: t('ui.disableHighAvailabilityMode'),
                text: t('ui.disablingHaModeWillRequireARestartOfTheInstance')
            }
            Dialog.show(msg, async () => {
                this.updating = true
                await InstanceApi.disableHAMode(this.instance.id)
                this.updating = false
                if (this.instance.meta?.state === 'suspended') {
                    Alerts.emit('High Availability mode disabled', 'confirmation')
                } else {
                    Alerts.emit('High Availability mode disabled. The Instance will now be restarted', 'confirmation')
                }
                this.$emit('instance-updated')
            })
        }
    }
}
</script>
