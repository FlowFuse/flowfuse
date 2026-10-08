<template>
    <div class="ff-team-build" data-page="team-build">
        <template v-if="team && !notAvailable">
            <!-- The layout's header (the teleport target) finishes mounting
                 after this page does, so the teleport waits a tick -->
            <Teleport v-if="teleportReady" to="#plain-layout-actions">
                <ff-button kind="tertiary" data-action="leave-build" @click="leave">
                    <template #icon-left>
                        <ArrowLeftIcon />
                    </template>
                    Back
                </ff-button>
            </Teleport>
            <ExpertFullPage :surface="surface" />
        </template>
    </div>
</template>

<script>
import { ArrowLeftIcon } from '@heroicons/vue/20/solid'
import { mapState } from 'pinia'

import ExpertFullPage from '@/components/expert/ExpertFullPage.vue'
import { EXPERT_SURFACES } from '@/components/expert/surfaces.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useAccountStore } from '@/stores/account.js'
import { useContextStore } from '@/stores/context.js'
import { SUPPORT_AGENT } from '@/stores/product-expert-agents.js'
import { useProductExpertSupportAgentStore } from '@/stores/product-expert-support-agent.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useUxStore } from '@/stores/ux.js'

export default {
    name: 'TeamBuild',
    components: {
        ArrowLeftIcon,
        ExpertFullPage
    },
    data () {
        return {
            surface: EXPERT_SURFACES.BUILDING,
            teleportReady: false,
            conversationRequested: false
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        notAvailable () {
            if (!this.team) {
                return false
            }
            return !this.featuresCheck.isAiFeatureEnabled || !this.featuresCheck.isExpertAssistantFeatureEnabled
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
            }
        },
        notAvailable: {
            immediate: true,
            handler (unavailable) {
                if (unavailable) {
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
    beforeUnmount () {
        // Whatever takes the user away, Back, the header, the browser or the
        // Expert navigating them, ends the build conversation and its planning
        useUxStore().stopBuilding()
        useProductExpertStore().setPlanMode(false)
    },
    methods: {
        openConversation () {
            if (!this.team || this.notAvailable || this.conversationRequested) {
                return
            }
            this.conversationRequested = true
            const expertStore = useProductExpertStore()
            // Building starts in plan mode, and both are on before the first turn so
            // the Expert knows from the start. Plan approval clears them together.
            useUxStore().startBuilding()
            expertStore.setPlanMode(true)
            expertStore.setAgentMode(SUPPORT_AGENT)
            // Start from an empty list but keep the session: the broker client is
            // signed in for it, so rotating it would get every publish rejected
            useProductExpertSupportAgentStore().messages = []
            expertStore.openConversation()
        },
        leave () {
            if (window.history.state?.back) {
                this.$router.back()
                return
            }
            this.$router.push({ name: 'team-home', params: { team_slug: this.team.slug } })
        }
    }
}
</script>

<style scoped lang="scss">
.ff-team-build {
    height: 100%;
}
</style>
