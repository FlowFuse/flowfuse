<template>
    <section class="ff-instance-step text-center flex flex-col gap-4 pt-6" data-step="instance">
        <h2>Setup your Remote Instance</h2>
        <form class="max-w-2xl m-auto w-full text-left flex flex-col gap-7">
            <FeatureUnavailableToTeam v-if="teamDeviceLimitReached" fullMessage="You have reached the limit for Remote Instances in this team." />
            <FeatureUnavailableToTeam v-else-if="teamRuntimeLimitReached" fullMessage="You have reached the limit for Instances in this team." />

            <div class="ff-instance-name ff-input-wrapper flex flex-col gap-1">
                <label class="mb-1">Name</label>
                <p class="opacity-50 text-sm">
                    Provide a unique, identifiable name for your Remote Instance.
                </p>
                <div class="ff-input-wrapper flex gap-3 items-center relative mb-4">
                    <ff-text-input
                        v-model="input.name"
                        label="instance-name"
                        :error="errors.name"
                        data-el="instance-name"
                    />
                </div>
            </div>
            <div class="ff-instance-name ff-input-wrapper flex flex-col gap-1">
                <label class="mb-1">Type</label>
                <p class="opacity-50 text-sm">
                    <i>Optional: </i> What type of device is this instance running on?
                </p>
                <div class="ff-input-wrapper flex gap-3 items-center relative mb-4">
                    <ff-text-input
                        v-model="input.type"
                        label="instance-type"
                        :error="errors.type"
                        data-el="instance-type"
                    />
                </div>
            </div>
            <!-- Billing details -->
            <div v-if="features.billing" class="my-5 text-left">
                <!-- <InstanceChargesTable
                    :project-type="selectedInstanceType"
                    :subscription="subscription"
                    :trialMode="isTrialProjectSelected"
                    :prorationMode="team?.type?.properties?.billing?.proration"
                /> -->
            </div>
        </form>
    </section>
</template>

<script>
import { mapState } from 'pinia'

import billingApi from '../../../../api/billing.js'
import { getTeamProperty } from '../../../../composables/TeamProperties.js'
// import InstanceChargesTable from '../../../../pages/instance/components/InstanceChargesTable.vue'
import FfTextInput from '../../../../ui-components/components/form/TextInput.vue'

import FeatureUnavailableToTeam from '../../../banners/FeatureUnavailableToTeam.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'DeviceStep',
    components: {
        // InstanceChargesTable,
        FeatureUnavailableToTeam,
        FfTextInput
    },
    props: {
        slug: {
            required: true,
            type: String
        },
        state: {
            required: false,
            type: Object,
            default: () => ({})
        },
        initialErrors: {
            required: false,
            type: Object,
            default: () => ({})
        }
    },
    emits: ['step-updated'],
    setup (props) {
        return {
            initialState: props.state,
        }
    },
    data () {
        return {
            input: {
                name: this.initialState.name || '',
                type: this.initialState.type || ''
            },
            errors: {
                name: this.initialErrors.name ?? null,
                type: this.initialErrors.type ?? null,
                limitsRuntime: this.initialErrors.limitsRuntime ?? null,
                limitsDevice: this.initialErrors.limitsDevice ?? null
            },
            subscription: null,
            loading: true,
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['features']),
        ...mapState(useContextStore, ['team']),
        teamRuntimeLimitReached () {
            let teamTypeRuntimeLimit = getTeamProperty(this.team, 'runtimes.limit')
            const currentRuntimeCount = this.team.deviceCount + this.team.instanceCount
            if (this.team.billing?.trial && !this.team.billing?.active && getTeamProperty(this.team, 'trial.runtimesLimit')) {
                teamTypeRuntimeLimit = getTeamProperty(this.team, 'trial.runtimesLimit')
            }
            return (teamTypeRuntimeLimit > 0 && currentRuntimeCount >= teamTypeRuntimeLimit)
        },
        teamDeviceLimitReached () {
            const teamTypeDeviceLimit = getTeamProperty(this.team, 'devices.limit')
            if (teamTypeDeviceLimit > 0 && this.team.deviceCount >= teamTypeDeviceLimit) {
                // Device specific limit has been reached
                return true
            }
            return false
        },
    },
    watch: {
        input: {
            immediate: true,
            deep: true,
            handler () {
                this.updateParent()
            }
        },
        'input.name': {
            immediate: true,
            handler: function (value) {
                if (this.input.name.trim().length === 0) {
                    this.errors.name = 'Name is required.'
                } else {
                    this.errors.name = null
                }
            }
        },
        errors: {
            deep: true,
            handler: function () {
                this.updateParent()
            }
        },
        teamRuntimeLimitReached: {
            immediate: true,
            handler: function (value) {
                if (value) {
                    this.errors.limitsRuntime = 'You have reached the limit for Remote Instances in this team.'
                } else {
                    this.errors.limitsRuntime = null
                }
            }
        },
        teamDeviceLimitReached: {
            immediate: true,
            handler: function (value) {
                if (value) {
                    this.errors.limitsDevice = 'You have reached the limit for Remote Instances in this team.'
                } else {
                    this.errors.limitsDevice = null
                }
            }
        }
    },
    async mounted () {
        this.updateParent()
        this.getSubscription()
            .catch(e => e)
            .finally(() => {
                this.loading = false
            })
    },
    methods: {
        async getSubscription () {
            if (this.features.billing && !this.team.billing?.unmanaged && !getTeamProperty(this.team, 'billing.disabled')) {
                try {
                    this.subscription = await billingApi.getSubscriptionInfo(this.team.id)
                } catch (err) {
                    if (err.response?.data?.code === 'not_found') {
                        // This team has no subscription.
                        if (!this.team.billing?.trial || this.team.billing?.trialEnded) {
                            throw err
                        }
                    }
                }
            }
        },

        updateParent () {
            let hasErrors = false

            Object.keys(this.errors).forEach(key => {
                if (this.errors[key] !== null) {
                    hasErrors = true
                }
            })

            // Handle the inital state of the form - where name is blank, but we don't show an error
            // as the user hasn't done anything yet
            if (this.input.name.trim().length === 0) {
                hasErrors = true
            }
            this.$emit('step-updated', {
                [this.slug]: {
                    input: { ...(this.input ?? {}) },
                    hasErrors,
                    errors: this.errors
                }
            })
        }
    }
}
</script>

<style scoped lang="scss">
</style>
