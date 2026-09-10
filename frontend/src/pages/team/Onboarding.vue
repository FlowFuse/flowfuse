<template>
    <div class="ff-team-onboarding" data-page="team-onboarding">
        <template v-if="team && !notAvailable">
            <!-- The layout's header (the teleport target) finishes mounting
                 after this page does, so the teleport waits a tick -->
            <Teleport v-if="teleportReady" to="#plain-layout-actions">
                <a
                    href="#"
                    class="skip-onboarding"
                    data-action="skip-onboarding"
                    @click.prevent="skipOnboarding"
                >Set it up myself</a>
            </Teleport>
            <div class="onboarding-column">
                <ExpertPanel />
            </div>
        </template>
    </div>
</template>

<script>
import { mapState } from 'pinia'

import teamApi from '@/api/team.ts'
import ExpertPanel from '@/components/expert/Expert.vue'
import { ONBOARDING_FIXTURE_MESSAGES } from '@/composables/Components/expert/onboardingFixture.js'
import Alerts from '@/services/alerts.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useAccountStore } from '@/stores/account.js'
import { useContextStore } from '@/stores/context.js'
import { useProductExpertSupportAgentStore } from '@/stores/product-expert-support-agent.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useUxStore } from '@/stores/ux.js'

export default {
    name: 'TeamOnboarding',
    components: {
        ExpertPanel
    },
    provide () {
        return {
            'expert-surface': 'onboarding'
        }
    },
    data () {
        return {
            provisioning: false,
            teleportReady: false
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        ...mapState(useUxStore, ['isOnboardingIntake']),
        notAvailable () {
            if (!this.team) {
                return false
            }
            return !this.featuresCheck.isAiOnboardingFeatureEnabled || !this.isOnboardingIntake
        }
    },
    watch: {
        '$route.params.team_slug': {
            immediate: true,
            handler (slug) {
                if (slug) {
                    useAccountStore().setTeam(slug)
                }
            }
        },
        team: {
            immediate: true,
            handler () {
                this.seedFixtureTranscript()
            }
        },
        notAvailable: {
            immediate: true,
            handler (unavailable) {
                if (unavailable) {
                    // Replace rather than push: onboarding is not somewhere the user should be able to go Back to.
                    this.$router.replace({
                        name: 'page-not-found',
                        params: { pathMatch: this.$route.path.substring(1).split('/') },
                        query: this.$route.query,
                        hash: this.$route.hash
                    })
                }
            }
        }
    },
    mounted () {
        this.$nextTick(() => {
            this.teleportReady = true
        })
    },
    methods: {
        // TEMPORARY until flowfuse#8369: the Expert can't open a conversation
        // on its own yet, so seed a placeholder transcript to work against.
        // A transcript holding only canned messages (`generated`, e.g. the
        // drawer's welcome text) counts as empty and gets replaced.
        seedFixtureTranscript () {
            if (!this.team || this.notAvailable) {
                return
            }
            const expertStore = useProductExpertStore()
            if (!expertStore.messages.every(message => message.generated)) {
                return
            }
            if (expertStore.messages.length > 0) {
                useProductExpertSupportAgentStore().reset()
            }
            expertStore.hydrateMessages(ONBOARDING_FIXTURE_MESSAGES)
        },
        async skipOnboarding () {
            if (this.provisioning) {
                return
            }
            this.provisioning = true
            try {
                await teamApi.provisionDefaultWorkspace(this.team.id)
            } catch (err) {
                // A team that already has instances is exactly where the
                // escape hatch wants to land anyway
                if (err.response?.data?.code !== 'team_not_empty') {
                    this.provisioning = false
                    Alerts.emit('Unable to set up your workspace. Please try again.', 'warning')
                    return
                }
            }
            useUxStore().endOnboarding()
            this.$router.push({ name: 'team-home', params: { team_slug: this.team.slug } })
        }
    }
}
</script>

<style scoped lang="scss">
.ff-team-onboarding {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    background: var(--ff-color-bg-app);
}

.skip-onboarding {
    font-size: 0.875rem;
    color: var(--ff-color-text-subtle);
    text-decoration: underline;
    text-underline-offset: 3px;
    white-space: nowrap;

    &:hover {
        color: var(--ff-color-text-strong);
    }
}

.onboarding-column {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    max-width: 46rem;
    padding: 1.5rem;
    min-height: 0;
}

/*
 * The onboarding treatment for the embedded expert panel. Everything below
 * restyles the shared chat components for this surface only; the drawer's
 * own styling is untouched.
 */

.onboarding-column :deep(.ff-expert) {
    background: transparent;
}

/* Flatten the chat bubbles: the transcript reads as a document, not a chat */
.onboarding-column :deep(.message-bubble.ai-message) {
    background: transparent;
    padding: 0;
    border-radius: 0;
}

.onboarding-column :deep(.message-bubble.human-message) {
    background: transparent;
    color: var(--ff-color-text-subtle);
    padding: 0;
    align-self: stretch;
}

/* The active question set renders as a card, per the mockup */
.onboarding-column :deep(.expert-questions) {
    background: var(--ff-color-bg-surface);
    border: 1px solid var(--ff-color-border);
    border-radius: 0.5rem;
    padding: 1.5rem;
    gap: 1.25rem;
}

.onboarding-column :deep(.expert-questions .question-title) {
    font-size: 1.25rem;
    font-weight: 600;
}

/* Options render as full-width bordered tiles */
.onboarding-column :deep(.expert-questions .ff-radio-btn),
.onboarding-column :deep(.expert-questions .ff-checkbox) {
    display: flex;
    align-items: center;
    width: 100%;
    border: 1px solid var(--ff-color-border);
    border-radius: 0.375rem;
    padding: 0.875rem 1rem 0.875rem 2.75rem;
    background: var(--ff-color-bg-surface);
    cursor: pointer;

    /* the control is absolutely positioned top-left by default;
       center it against the tile */
    .checkbox {
        top: 50%;
        left: 1rem;
        transform: translateY(-50%);
    }

    &:hover {
        border-color: var(--ff-color-text-subtle);
    }

    &:has(.checkbox[checked='true']) {
        border-color: var(--ff-color-accent);
        background: var(--ff-color-accent-surface);
    }
}

/* The composer sits quietly at the bottom: no divider, no panel chrome */
.onboarding-column :deep(.ff-expert-input) {
    border-top: none;
    background: transparent;
    min-height: 0;
    padding: 1rem 0;
}

.onboarding-column :deep(.expert-questions .ff-radio-group-options) {
    gap: 0.625rem;
}

.onboarding-column :deep(.expert-questions .questions-actions) {
    margin-top: 0.25rem;
}
</style>
