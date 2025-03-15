<template>
    <div class="clear-page-gutters">
        <div class="ff-instance-header">
            <ff-page-header title="Notifications Hub" />
        </div>
        <div class="px-3 py-3 md:px-6 md:py-6">
            <form class="flex flex-col gap-5" data-el="notification-form" @submit.prevent>
                <section class="flex gap-10">
                    <section>
                        <FormRow v-model="form.title" type="input" placeholder="Title" class="mb-5" data-el="notification-title">
                            Announcement Title
                            <template #description>Enter a concise title for your announcement.</template>
                        </FormRow>
                        <FormRow v-model="form.message" class="mb-5" data-el="notification-message">
                            Announcement Text
                            <template #description>Provide the details of your announcement.</template>
                            <template #input><textarea v-model="form.message" class="w-full max-h-80 min-h-40" rows="4" /></template>
                        </FormRow>
                        <FormRow v-model="form.url" type="input" :placeholder="urlPlaceholder" class="mb-5" data-el="notification-external-url">
                            URL Link
                            <template #description>Provide an url where users will be redirected when they click on the notification.</template>
                        </FormRow>
                    </section>
                    <section>
                        <FormHeading>Audience</FormHeading>
                        <div class="ff-description mb-2 space-y-1">Select the audience of your announcement.</div>
                        <FormHeading class="mt-4">User Roles:</FormHeading>
                        <div class="grid gap-1 grid-cols-2 items-middle">
                            <label
                                v-for="(role, $key) in roleIds"
                                :key="$key"
                                class="ff-checkbox text-sm"
                                :data-el="`audience-role-${role}`"
                                @keydown.space.prevent="toggleRole(role)"
                            >
                                <span ref="input" class="checkbox" :checked="form.roles.includes(role)" tabindex="0" @keydown.space.prevent />
                                <input v-model="form.roles" type="checkbox" :value="role" @keydown.space.prevent>
                                {{ role }}
                            </label>
                        </div>
                        <FormHeading class="mt-4">Team Types:</FormHeading>
                        <div class="grid gap-1 grid-cols-2 items-middle">
                            <label
                                v-for="teamType in teamTypes"
                                :key="teamType.id"
                                class="ff-checkbox text-sm"
                                :class="!teamType.active ? ['inactive-team'] : []"
                                :data-el="`audience-teamType-${teamType.id}`"
                                @keydown.space.prevent="toggleTeamType(teamType.id)"
                            >
                                <span ref="input" class="checkbox" :checked="form.teamTypes.includes(teamType.id)" tabindex="0" @keydown.space.prevent />
                                <input v-model="form.teamTypes" type="checkbox" :value="teamType.id" @keydown.space.prevent>
                                {{ teamType.name }}
                            </label>
                        </div>
                        <template v-if="features.billing">
                            <FormHeading class="mt-4">Billing State:</FormHeading>
                            <div class="grid gap-1 grid-cols-2 items-middle">
                                <label
                                    v-for="(billingState, $key) in billingStates"
                                    :key="$key"
                                    class="ff-checkbox text-sm"
                                    :data-el="`audience-billing-${billingState}`"
                                    @keydown.space.prevent="toggleBillingState(billingState)"
                                >
                                    <span ref="input" class="checkbox" :checked="form.billing.includes(billingState)" tabindex="0" @keydown.space.prevent />
                                    <input v-model="form.billing" type="checkbox" :value="billingState" @keydown.space.prevent>
                                    {{ billingState }}
                                </label>
                            </div>
                        </template>
                    </section>
                </section>
                <section class="actions">
                    <ff-button :disabled="!canSubmit" data-action="submit" @click.stop.prevent="submitForm">
                        Send Announcement
                    </ff-button>
                </section>
            </form>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import adminApi from '../../api/admin.js'
import teamTypesApi from '../../api/teamTypes.js'

import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'
import { pluralize } from '../../composables/String.js'
import alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import FfButton from '../../ui-components/components/Button.vue'
import { RoleNames, Roles } from '../../utils/roles.js'
export default {
    name: 'NotificationsHub',
    components: { FfButton, FormRow, FormHeading },
    data () {
        return {
            form: {
                title: '',
                message: '',
                url: '',
                roles: [],
                teamTypes: [],
                billing: [],
                externalUrl: true
            },
            teamTypes: [],
            billingStates: [
                'Active',
                'Trial',
                'Unmanaged',
                'Canceled'
            ],
            errors: {

            }
        }
    },
    computed: {
        ...mapState('account', ['features']),
        roleIds () {
            return Object.values(RoleNames).filter(r => r !== 'none').reverse().map(r => r[0].toUpperCase() + r.substring(1))
        },
        canSubmit () {
            return this.form.title.length > 0 &&
                this.form.message.length > 0 &&
                this.form.roles.length > 0 &&
                this.form.teamTypes.length > 0 &&
                (!this.features.billing || this.form.billing.length > 0)
        },
        urlPlaceholder () {
            return this.form.externalUrl ? 'https://flowfuse.com' : '{ name: "<component-name>", params: {id: "<id>"} }'
        }
    },
    async created () {
        const teamTypes = (await teamTypesApi.getTeamTypes(null, null, 'all')).types
        this.teamTypes = teamTypes.map(tt => {
            return {
                order: tt.order,
                id: tt.id,
                name: tt.name,
                active: tt.active
            }
        })
        this.teamTypes.sort((A, B) => {
            if (A.active === B.active) {
                return A.order - B.order
            } else if (A.active) {
                return -1
            } else {
                return 1
            }
        })
    },
    methods: {
        getAnnouncements () {
            return adminApi.getAnnouncementNotifications()
                .then(res => console.info(res))
        },
        submitForm () {
            return this.sendAnnouncementNotification({ mock: true })
                .then(mockRes => {
                    if (mockRes.recipientCount === 0) {
                        Dialog.show({
                            header: 'Platform Wide Announcement',
                            text: 'Your filters matched no users.',
                            confirmLabel: 'Cancel',
                            canBeCanceled: false
                        })
                    } else {
                        Dialog.show({
                            header: 'Platform Wide Announcement',
                            kind: 'danger',
                            text: `You are about to send an announcement to ${mockRes.recipientCount} ${pluralize('user', mockRes.recipientCount)}.`,
                            confirmLabel: 'Continue',
                            canBeCanceled: true
                        }, async () => this.sendAnnouncementNotification({ mock: false }))
                    }
                })
        },
        sendAnnouncementNotification ({ mock = true }) {
            const form = { ...this.form }
            delete form.url

            const payload = {
                mock,
                title: form.title,
                message: form.message,
                url: form.url,
                filter: {
                    roles: this.form.roles.map(r => Roles[r]),
                    teamTypes: [...this.form.teamTypes]
                },
                ...(this.form.externalUrl ? { url: this.form.url } : { to: JSON.parse(this.form.url) })
            }
            if (this.features.billing) {
                payload.filter.billing = [...this.form.billing]
            }
            return adminApi.sendAnnouncementNotification(payload)
                .then(res => {
                    if (!mock) {
                        alerts.emit(`Announcement sent to ${res.recipientCount} ${pluralize('user', res.recipientCount)}.`, 'confirmation')
                        this.form.title = ''
                        this.form.message = ''
                        this.form.url = ''
                        this.form.roles = []
                        this.form.teamTypes = []
                        this.form.billing = []
                    }
                    return res
                })
                .catch(err => {
                    alerts.emit('Something went wrong', 'warning')
                    console.warn(err)
                })
        },
        toggleRole (role) {
            if (this.form.roles.includes(role)) {
                this.form.roles = this.form.roles.filter(r => r !== role)
            } else this.form.roles.push(role)
        },
        toggleTeamType (teamTypeId) {
            if (this.form.teamTypes.includes(teamTypeId)) {
                this.form.teamTypes = this.form.teamTypes.filter(r => r !== teamTypeId)
            } else this.form.teamTypes.push(teamTypeId)
        },
        toggleBillingState (billingState) {
            if (this.form.billing.includes(billingState)) {
                this.form.billing = this.form.billing.filter(r => r !== billingState)
            } else this.form.billing.push(billingState)
        }

    }
}
</script>

<style scoped lang="scss">
.inactive-team {
    color: $ff-grey-400;
}
.clear-page-gutters {
    margin: -1.75rem
}
</style>
