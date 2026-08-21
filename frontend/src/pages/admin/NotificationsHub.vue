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
                        <template #input><textarea v-model="form.message" class="w-full max-h-96 min-h-40" rows="8" :maxlength="4000" /></template>
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
            <section class="announcement-audience">
                <FormHeading>Audience</FormHeading>
                <div class="ff-description mb-2">Select the audience of your announcement.</div>
                <div class="audience-groups">
                    <div class="audience-group">
                        <FormHeading>User Roles:</FormHeading>
                        <div class="audience-options">
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
                    </div>
                    <div class="audience-group">
                        <FormHeading>Send To:</FormHeading>
                        <ff-radio-group
                            v-model="form.audienceMode"
                            orientation="vertical"
                            :options="audienceModes"
                            data-el="audience-mode"
                        />
                    </div>
                    <template v-if="targetsTeamTypes">
                        <div class="audience-group">
                            <FormHeading>Team Types:</FormHeading>
                            <div class="audience-options">
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
                        </div>
                        <div v-if="features.billing" class="audience-group">
                            <FormHeading>Billing State:</FormHeading>
                            <div class="audience-options">
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
                        </div>
                    </template>
                    <div v-else class="audience-group" data-el="audience-teams-hint">
                        <FormHeading>Selected:</FormHeading>
                        <div class="ff-description">
                            {{ form.teams.length }} {{ form.teams.length === 1 ? 'team' : 'teams' }} chosen in the table below.
                        </div>
                    </div>
                </div>
            </section>
            <section v-if="targetsSpecificTeams" class="announcement-teams">
                <FormHeading>Specific Teams</FormHeading>
                <div class="ff-description mb-2">
                    Pick the exact teams this announcement goes to. The selection is kept as you search, filter and
                    page through the list. Suspended teams are left out, because they cannot receive notifications.
                </div>
                <TeamAudiencePicker v-model="form.teams" />
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
import { MegaphoneIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import adminApi from '../../api/admin.js'
import teamTypesApi from '../../api/teamTypes.js'

import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'
import AnnouncementBody from '../../components/notifications/announcements/AnnouncementBody.vue'
import { pluralize } from '../../composables/strings/String.js'
import alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import FfButton from '../../ui-components/components/Button.vue'
import { RoleNames, Roles } from '../../utils/roles.js'

import TeamAudiencePicker from './components/TeamAudiencePicker.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

// Kept in step with the maxLength values on POST /api/v1/admin/announcements
const MAX_LENGTHS = {
    title: 120,
    message: 4000,
    video: 300,
    ctaLabel: 40,
    ctaUrl: 500,
    url: 500
}
// Kept in step with forge/lib/announcements.js
const YOUTUBE_HOSTS = ['youtu.be', 'youtube.com', 'm.youtube.com', 'youtube-nocookie.com']

export default {
    name: 'NotificationsHub',
    components: { AnnouncementBody, FfButton, FormRow, FormHeading, MegaphoneIcon, TeamAudiencePicker },
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
                audienceMode: 'teamTypes',
                teamTypes: [],
                teams: [],
                billing: []
            },
            audienceModes: [
                { label: 'Teams of a type', value: 'teamTypes', description: 'Everyone in every team on the types you pick.' },
                { label: 'Specific teams', value: 'teams', description: 'Only the teams you choose from the list.' }
            ],
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
            return this.form.audienceMode === 'teams'
        },
        targetsTeamTypes () {
            return this.form.audienceMode === 'teamTypes'
        },
        hasAudienceScope () {
            if (this.targetsSpecificTeams) {
                return this.form.teams.length > 0
            }
            return this.form.teamTypes.length > 0 &&
                (!this.features.billing || this.form.billing.length > 0)
        },
        withinLengthLimits () {
            // The API rejects an over-long field with a bare "Bad Request", so
            // the limits are enforced before the request is made
            return Object.entries(MAX_LENGTHS)
                .every(([field, limit]) => (this.form[field] || '').length <= limit)
        },
        canSubmit () {
            return this.form.title.length > 0 &&
                this.form.message.length > 0 &&
                this.form.roles.length > 0 &&
                this.withinLengthLimits &&
                this.hasAudienceScope
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
            // Mirrors the server side check, host included, so the preview only
            // shows an embed for a link the API will actually accept.
            const value = (this.form.video || '').trim()
            if (/^[A-Za-z0-9_-]{11}$/.test(value)) {
                return { provider: 'youtube', id: value }
            }
            let url
            try {
                url = new URL(value)
            } catch (_err) {
                return null
            }
            if (url.protocol !== 'https:' && url.protocol !== 'http:') {
                return null
            }
            const host = url.hostname.replace(/^www\./, '')
            if (!YOUTUBE_HOSTS.includes(host)) {
                return null
            }
            let candidate = null
            if (host === 'youtu.be') {
                candidate = url.pathname.slice(1)
            } else if (url.pathname === '/watch') {
                candidate = url.searchParams.get('v')
            } else {
                const prefix = ['/embed/', '/shorts/', '/live/'].find(p => url.pathname.startsWith(p))
                candidate = prefix ? url.pathname.slice(prefix.length) : null
            }
            return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate)
                ? { provider: 'youtube', id: candidate }
                : null
        }
    },
    watch: {
        'form.audienceMode' (mode) {
            // Only one audience definition is ever live, so leaving the other
            // half populated would be invisible state
            if (mode === 'teams') {
                this.form.teamTypes = []
                this.form.billing = []
            } else {
                this.form.teams = []
            }
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
                payload.filter.teams = this.form.teams.map(team => team.id)
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
            this.form.audienceMode = 'teamTypes'
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

.announcement-content {
    width: 420px;
    max-width: 100%;
}

.announcement-audience {
    width: 100%;

    .audience-groups {
        display: flex;
        gap: $ff-unit-xl;
        flex-wrap: wrap;
        align-items: flex-start;
    }

    .audience-group {
        min-width: 160px;
    }

    .audience-options {
        display: grid;
        grid-template-columns: repeat(2, minmax(90px, max-content));
        gap: 2px $ff-unit-lg;
        margin-top: $ff-unit-sm;
    }
}

.announcement-preview {
    width: 400px;
    max-width: 100%;
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
