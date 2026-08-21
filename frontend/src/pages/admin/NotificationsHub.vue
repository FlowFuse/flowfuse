<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Notifications Hub" />
        </template>
        <form class="flex flex-col gap-5" data-el="notification-form" @submit.prevent>
            <section class="flex gap-10 flex-wrap items-start">
                <section class="announcement-content">
                    <FormRow v-model="form.title" type="input" placeholder="Title" class="mb-5" data-el="notification-title">
                        Announcement Title
                        <template #description>Enter a concise title for your announcement.</template>
                    </FormRow>
                    <FormRow v-model="form.message" class="mb-5" data-el="notification-message">
                        Announcement Text
                        <template #description>
                            Provide the details of your announcement.
                            <label class="ff-checkbox text-sm mt-2" data-el="notification-rich-text-toggle" @keydown.space.prevent="form.richText = !form.richText">
                                <span ref="input" class="checkbox" :checked="form.richText" tabindex="0" @keydown.space.prevent />
                                <input v-model="form.richText" type="checkbox" @keydown.space.prevent>
                                Rich text (markdown)
                            </label>
                        </template>
                        <template #input><textarea v-model="form.message" class="w-full max-h-96 min-h-40" rows="8" /></template>
                    </FormRow>
                    <FormRow v-model="form.video" type="input" placeholder="https://www.youtube.com/watch?v=..." class="mb-5" data-el="notification-video">
                        Video
                        <template #description>Optional. A YouTube link to embed in the announcement.</template>
                    </FormRow>
                    <div class="flex gap-4 mb-5">
                        <FormRow v-model="form.ctaLabel" type="input" placeholder="Talk to sales" data-el="notification-cta-label">
                            Button Label
                            <template #description>Optional.</template>
                        </FormRow>
                        <FormRow v-model="form.ctaUrl" type="input" placeholder="https://flowfuse.com/contact/" data-el="notification-cta-url">
                            Button URL
                            <template #description>Where the button goes.</template>
                        </FormRow>
                    </div>
                    <FormRow v-model="form.url" type="input" :placeholder="urlPlaceholder" class="mb-5" data-el="notification-external-url">
                        URL Link
                        <template #description>
                            Optional. Makes the whole notification clickable. Only applies to plain text announcements,
                            because a rich text announcement carries its own links, video and button.
                        </template>
                    </FormRow>
                </section>
                <section class="announcement-audience">
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
                            :class="[!teamType.active ? 'inactive-team' : '', targetsSpecificTeams ? 'disabled-audience' : '']"
                            :data-el="`audience-teamType-${teamType.id}`"
                            @keydown.space.prevent="toggleTeamType(teamType.id)"
                        >
                            <span ref="input" class="checkbox" :checked="form.teamTypes.includes(teamType.id)" tabindex="0" @keydown.space.prevent />
                            <input v-model="form.teamTypes" type="checkbox" :value="teamType.id" :disabled="targetsSpecificTeams" @keydown.space.prevent>
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
                    <FormHeading class="mt-4">Specific Teams:</FormHeading>
                    <div class="ff-description mb-2">
                        Search for teams by name to target them directly. Selecting teams here overrides the team type filter.
                    </div>
                    <ff-combobox
                        v-model="teamSearchSelection"
                        :options="[]"
                        :fetch-remote-options="searchTeams"
                        :return-model="true"
                        placeholder="Search teams by name"
                        data-el="audience-team-search"
                        @update:model-value="addTeam"
                    />
                    <div v-if="form.teams.length" class="selected-teams" data-el="audience-selected-teams">
                        <span
                            v-for="team in form.teams"
                            :key="team.value"
                            class="selected-team"
                            :data-el="`audience-team-${team.value}`"
                        >
                            {{ team.label }}
                            <XMarkIcon class="ff-icon" :data-action="`remove-team-${team.value}`" @click="removeTeam(team)" />
                        </span>
                        <span class="clear-teams" data-action="clear-teams" @click="form.teams = []">clear all</span>
                    </div>
                </section>
                <section class="announcement-preview">
                    <FormHeading>Preview</FormHeading>
                    <div class="ff-description mb-2">How this will look in the notifications drawer and toast.</div>
                    <div class="preview-frame" data-el="notification-preview">
                        <div class="preview-card">
                            <div class="preview-card--header">
                                <MegaphoneIcon class="ff-icon" />
                                <h4>{{ form.title || 'Announcement title' }}</h4>
                            </div>
                            <AnnouncementBody :data="previewData" />
                        </div>
                    </div>
                </section>
            </section>
            <section class="actions">
                <ff-button :disabled="!canSubmit" data-action="submit" @click.stop.prevent="submitForm">
                    Send Announcement
                </ff-button>
            </section>
        </form>
    </ff-page>
</template>

<script>
import { MegaphoneIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import adminApi from '../../api/admin.js'
import teamTypesApi from '../../api/teamTypes.js'
import teamsApi from '../../api/teams.js'

import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'
import AnnouncementBody from '../../components/notifications/announcements/AnnouncementBody.vue'
import { pluralize } from '../../composables/strings/String.js'
import alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import FfButton from '../../ui-components/components/Button.vue'
import { RoleNames, Roles } from '../../utils/roles.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

const TEAM_SEARCH_LIMIT = 20

export default {
    name: 'NotificationsHub',
    components: { AnnouncementBody, FfButton, FormRow, FormHeading, MegaphoneIcon, XMarkIcon },
    data () {
        return {
            form: {
                title: '',
                message: '',
                url: '',
                video: '',
                ctaLabel: '',
                ctaUrl: '',
                richText: true,
                roles: [],
                teamTypes: [],
                teams: [],
                billing: []
            },
            teamSearchSelection: null,
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
        targetsSpecificTeams () {
            return this.form.teams.length > 0
        },
        hasAudienceScope () {
            return this.targetsSpecificTeams || this.form.teamTypes.length > 0
        },
        canSubmit () {
            return this.form.title.length > 0 &&
                this.form.message.length > 0 &&
                this.form.roles.length > 0 &&
                this.hasAudienceScope &&
                (!this.features.billing || this.targetsSpecificTeams || this.form.billing.length > 0)
        },
        urlPlaceholder () {
            return 'https://flowfuse.com'
        },
        previewData () {
            return {
                title: this.form.title,
                message: this.form.message || '_Your announcement text will appear here._',
                ...(this.form.richText && { format: 'markdown' }),
                ...(this.previewVideo && { video: this.previewVideo }),
                ...(this.form.ctaLabel && this.form.ctaUrl && { cta: { label: this.form.ctaLabel, url: this.form.ctaUrl } })
            }
        },
        previewVideo () {
            // Mirror of the server side check, so the preview only shows an embed
            // for a link the API will actually accept.
            const value = (this.form.video || '').trim()
            const match = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/.exec(value)
            if (match) {
                return { provider: 'youtube', id: match[1] }
            }
            if (/^[A-Za-z0-9_-]{11}$/.test(value)) {
                return { provider: 'youtube', id: value }
            }
            return null
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
        searchTeams (query) {
            return teamsApi.getTeams(null, TEAM_SEARCH_LIMIT, query || '')
                .then(res => (res.teams || []).map(team => ({
                    label: team.name,
                    value: team.id,
                    teamType: team.type?.name
                })))
                .catch(() => [])
        },
        addTeam (team) {
            if (!team?.value) {
                return
            }
            if (!this.form.teams.some(selected => selected.value === team.value)) {
                this.form.teams.push({ label: team.label, value: team.value })
            }
            // Clear the search box so the next pick starts from empty
            this.$nextTick(() => {
                this.teamSearchSelection = null
            })
        },
        removeTeam (team) {
            this.form.teams = this.form.teams.filter(selected => selected.value !== team.value)
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
            const payload = {
                mock,
                title: this.form.title,
                message: this.form.message,
                format: this.form.richText ? 'markdown' : 'plain',
                filter: {
                    roles: this.form.roles.map(r => Roles[r])
                }
            }
            if (this.targetsSpecificTeams) {
                payload.filter.teams = this.form.teams.map(team => team.value)
            } else {
                payload.filter.teamTypes = [...this.form.teamTypes]
                if (this.features.billing) {
                    payload.filter.billing = [...this.form.billing]
                }
            }
            if (this.form.video) {
                payload.video = this.form.video
            }
            if (this.form.ctaLabel && this.form.ctaUrl) {
                payload.cta = { label: this.form.ctaLabel, url: this.form.ctaUrl }
            }
            if (this.form.url && !this.form.richText) {
                payload.url = this.form.url
            }
            return adminApi.sendAnnouncementNotification(payload)
                .then(res => {
                    if (!mock) {
                        alerts.emit(`Announcement sent to ${res.recipientCount} ${pluralize('user', res.recipientCount)}.`, 'confirmation')
                        this.resetForm()
                    }
                    return res
                })
                .catch(err => {
                    alerts.emit(err.response?.data?.error || 'Something went wrong', 'warning')
                    console.warn(err)
                    return { recipientCount: 0 }
                })
        },
        resetForm () {
            this.form.title = ''
            this.form.message = ''
            this.form.url = ''
            this.form.video = ''
            this.form.ctaLabel = ''
            this.form.ctaUrl = ''
            this.form.roles = []
            this.form.teamTypes = []
            this.form.teams = []
            this.form.billing = []
        },
        toggleRole (role) {
            if (this.form.roles.includes(role)) {
                this.form.roles = this.form.roles.filter(r => r !== role)
            } else this.form.roles.push(role)
        },
        toggleTeamType (teamTypeId) {
            if (this.targetsSpecificTeams) {
                return
            }
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

.disabled-audience {
    opacity: 0.5;
}

.announcement-content {
    width: 420px;
    max-width: 100%;
}

.announcement-audience {
    width: 320px;
    max-width: 100%;
}

.announcement-preview {
    width: 400px;
    max-width: 100%;
}

.selected-teams {
    display: flex;
    flex-wrap: wrap;
    gap: $ff-unit-sm;
    margin-top: $ff-unit-md;

    .selected-team {
        display: flex;
        align-items: center;
        gap: $ff-unit-xs;
        font-size: 0.85rem;
        padding: 2px $ff-unit-sm;
        border: 1px solid var(--ff-color-border-strong);
        background-color: var(--ff-color-bg-surface-raised);
        border-radius: 5px;

        .ff-icon {
            height: 14px;
            width: 14px;
            cursor: pointer;
        }
    }

    .clear-teams {
        font-size: 0.85rem;
        color: var(--ff-color-link);
        text-decoration: underline;
        cursor: pointer;
        align-self: center;
    }
}

.preview-frame {
    border: 1px solid var(--ff-color-border-strong);
    background-color: var(--ff-color-bg-surface-raised);
    padding: $ff-unit-md;

    .preview-card {
        background-color: var(--ff-color-bg-app);
        border-left: 3px solid var(--ff-color-link);
        padding: $ff-unit-md 12px;
        display: flex;
        flex-direction: column;
        gap: $ff-unit-md;

        .preview-card--header {
            display: flex;
            align-items: center;
            gap: $ff-unit-sm;

            h4 {
                font-weight: 600;
            }
        }
    }
}
</style>
