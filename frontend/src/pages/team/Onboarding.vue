<template>
    <div class="ff-team-onboarding" data-page="team-onboarding">
        <template v-if="team && !notAvailable">
            <!-- The layout's header (the teleport target) finishes mounting
                 after this page does, so the teleport waits a tick -->
            <Teleport v-if="teleportReady" to="#plain-layout-actions">
                <ff-button
                    kind="tertiary"
                    class="skip-onboarding"
                    :class="{ 'has-engaged': hasEngaged }"
                    data-action="skip-onboarding"
                    :disabled="provisioning"
                    @click="skipOnboarding"
                >
                    Set it up myself
                </ff-button>
                <!-- Sign-out is the only navigation offered on this page -->
                <ff-dropdown
                    v-if="user"
                    :show-chevron="false"
                    class="ff-navigation ff-user-options"
                    options-align="right"
                    data-action="user-options"
                >
                    <template #placeholder>
                        <div class="ff-user">
                            <img :src="user.avatar" class="ff-avatar">
                        </div>
                    </template>
                    <template #default>
                        <ff-dropdown-option data-nav="sign-out" @click="signOut">
                            <nav-item label="Sign Out" :icon="signOutIcon" />
                        </ff-dropdown-option>
                    </template>
                </ff-dropdown>
            </Teleport>
            <div class="onboarding-column">
                <ExpertPanel />
            </div>
        </template>
    </div>
</template>

<script>
import { ArrowLeftOnRectangleIcon } from '@heroicons/vue/20/solid'
import { mapState } from 'pinia'

import teamApi from '@/api/team.ts'
import NavItem from '@/components/NavItem.vue'
import ExpertPanel from '@/components/expert/Expert.vue'
import navigationMixin from '@/mixins/Navigation.js'
import Alerts from '@/services/alerts.js'
import Product from '@/services/product.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useAccountStore } from '@/stores/account.js'
import { useContextStore } from '@/stores/context.js'
import { useProductExpertSupportAgentStore } from '@/stores/product-expert-support-agent.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useUxStore } from '@/stores/ux.js'

export default {
    name: 'TeamOnboarding',
    components: {
        ExpertPanel,
        NavItem
    },
    mixins: [navigationMixin],
    provide () {
        return {
            'expert-surface': 'onboarding'
        }
    },
    data () {
        return {
            provisioning: false,
            teleportReady: false,
            conversationRequested: false,
            // How many turns the user had contributed when the page opened.
            // Anything beyond it is them engaging, which lets the seeded
            // transcript exist without counting as engagement.
            initialUserTurns: null,
            hasEngaged: false
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        ...mapState(useUxStore, ['isOnboardingIntake']),
        ...mapState(useProductExpertStore, ['messages']),
        ...mapState(useAccountAuthStore, ['user']),
        signOutIcon () {
            return ArrowLeftOnRectangleIcon
        },
        userTurns () {
            return this.messages.filter(message => message._type === 'human').length
        },
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
                this.openConversation()
                // The baseline is taken here, once the team has resolved,
                // rather than in the userTurns watcher: on a direct page load
                // that watcher fires before the team resolves, and any turns
                // the transcript picks up afterwards would count as engagement
                if (this.team && this.initialUserTurns === null) {
                    this.initialUserTurns = this.userTurns
                }
            }
        },
        userTurns (turns) {
            // Engagement is the user answering or saying something, not a
            // timer, so the control only recedes once they have committed
            // to the conversation
            if (this.initialUserTurns !== null && turns > this.initialUserTurns) {
                this.hasEngaged = true
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
        openConversation () {
            if (!this.team || this.notAvailable || this.conversationRequested) {
                return
            }
            const expertStore = useProductExpertStore()
            if (!expertStore.messages.every(message => message.generated)) {
                return
            }
            if (expertStore.messages.length > 0) {
                useProductExpertSupportAgentStore().reset()
            }
            this.conversationRequested = true
            Product.capture('ff-onboarding-opened', {}, { team: this.team.id })
            expertStore.openConversation()
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
            Product.capture('ff-onboarding-skipped', {}, { team: this.team.id })
            // Leave first: ending the stage while this page is still mounted
            // flips notAvailable, whose watcher would beat this navigation
            // with its own redirect to the 404 page
            await this.$router.push({ name: 'team-home', params: { team_slug: this.team.slug } })
            useUxStore().endOnboarding()
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
    transition: opacity 0.4s ease;

    &:hover {
        color: var(--ff-color-text-strong);
    }

    /* Still reachable once they are in the conversation, just no longer
       competing with it for attention */
    &.has-engaged {
        opacity: 0.45;

        &:hover,
        &:focus-visible {
            opacity: 1;
        }
    }
}

@media (prefers-reduced-motion: reduce) {
    .skip-onboarding {
        transition: none;
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
