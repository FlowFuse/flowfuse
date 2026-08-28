<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.notificationsHub')" />
        </template>
        <form class="flex flex-col gap-5" data-el="notification-form" @submit.prevent>
            <section class="flex gap-10">
                <section>
                    <FormRow v-model="form.title" type="input" :placeholder="$t('ui.title')" class="mb-5" data-el="notification-title">
                        {{ $t('ui.announcementTitle') }}
                        <template #description>{{ $t('ui.enterAConciseTitleForYourAnnouncement') }}</template>
                    </FormRow>
                    <FormRow v-model="form.message" class="mb-5" data-el="notification-message">
                        {{ $t('ui.announcementText') }}
                        <template #description>{{ $t('ui.provideTheDetailsOfYourAnnouncement') }}</template>
                        <template #input><textarea v-model="form.message" class="w-full max-h-80 min-h-40" rows="4" /></template>
                    </FormRow>
                    <FormRow v-model="form.url" type="input" :placeholder="urlPlaceholder" class="mb-5" data-el="notification-external-url">
                        {{ $t('ui.urlLink') }}
                        <template #description>{{ $t('ui.provideAnUrlWhereUsersWillBeRedirectedWhenTheyCl') }}</template>
                    </FormRow>
                </section>
                <section>
                    <FormHeading>{{ $t('ui.audience') }}</FormHeading>
                    <div class="ff-description mb-2 space-y-1">{{ $t('ui.selectTheAudienceOfYourAnnouncement') }}</div>
                    <FormHeading class="mt-4">{{ $t('ui.userRoles') }}</FormHeading>
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
                    <FormHeading class="mt-4">{{ $t('ui.teamTypes') }}</FormHeading>
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
                        <FormHeading class="mt-4">{{ $t('ui.billingState') }}</FormHeading>
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
                    {{ $t('ui.sendAnnouncement') }}
                </ff-button>
            </section>
        </form>
    </ff-page>
</template>

<script>
import { mapState } from 'pinia'

import adminApi from '../../api/admin.js'
import teamTypesApi from '../../api/teamTypes.js'

import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'
import { t } from '../../i18n.js'
import alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import FfButton from '../../ui-components/components/Button.vue'
import { RoleNames, Roles } from '../../utils/roles.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

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
        ...mapState(useAccountSettingsStore, ['features']),
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
                            header: t('ui.platformWideAnnouncement'),
                            text: t('ui.yourFiltersMatchedNoUsers'),
                            confirmLabel: 'Cancel',
                            canBeCanceled: false
                        })
                    } else {
                        Dialog.show({
                            header: t('ui.platformWideAnnouncement'),
                            kind: 'danger',
                            text: this.$t('ui.youAreAboutToSendAnAnnouncementTo', { count: mockRes.recipientCount, noun: this.$t('ui.plUser', mockRes.recipientCount) }),
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
                        alerts.emit(this.$t('ui.announcementSentTo', { count: res.recipientCount, noun: this.$t('ui.plUser', res.recipientCount) }), 'confirmation')
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
                    alerts.emit(t('ui.somethingWentWrong2'), 'warning')
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
    color: var(--ff-color-text-subtle);
}
</style>
