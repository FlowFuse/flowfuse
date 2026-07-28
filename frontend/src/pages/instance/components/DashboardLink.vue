<template>
    <div v-if="!hidden" :data-type="`${isEmbedded ? 'embedded' : 'direct'}-dashboard`">
        <ff-button
            v-if="!isEmbedded || minimalView"
            :kind="minimalView ? 'tertiary' : 'secondary'"
            data-action="open-dashboard"
            :disabled="buttonDisabled"
            class="whitespace-nowrap"
            :emit-instead-of-navigate="true"
            @click.stop.prevent="openPrimary"
            @click.middle.stop.prevent="openPrimary"
        >
            <template v-if="!minimalView" #icon-left>
                <ChartPieIcon />
            </template>
            <template v-else #icon>
                <ChartPieIcon />
            </template>
            <template v-if="!minimalView">
                <span class="hidden sm:inline dashboard-link-text">Dashboard</span>
            </template>
        </ff-button>

        <SplitButton
            v-else
            label="Dashboard"
            data-action="open-dashboard"
            :disabled="buttonDisabled"
            :options="dropdownOptions"
            @primary-click="openEmbedded"
        >
            <template #icon>
                <ChartPieIcon class="ff-btn--icon mr-2" />
            </template>
        </SplitButton>
    </div>
</template>

<script>
import { ChartPieIcon } from '@heroicons/vue/24/outline'

import SplitButton from '../../../components/SplitButton.vue'
import { useNavigationHelper } from '../../../composables/NavigationHelper.js'
import { removeSlashes } from '../../../composables/strings/String.js'
import { useContextStore } from '../../../stores/context.js'

export default {
    name: 'DashboardLink',
    components: { ChartPieIcon, SplitButton },
    inheritAttrs: false,
    props: {
        disabled: {
            default: false,
            type: Boolean
        },
        hidden: {
            default: false,
            type: Boolean
        },
        instance: {
            default: null,
            type: Object
        },
        showText: {
            type: Boolean,
            default: true
        },
        minimalView: {
            type: Boolean,
            default: false
        },
        scope: {
            type: String,
            default: null,
            validator: value => value === null || ['team', 'application'].includes(value)
        }
    },
    setup () {
        const { openInANewTab, navigateTo } = useNavigationHelper()
        const contextStore = useContextStore()
        return { openInANewTab, navigateTo, contextStore }
    },
    computed: {
        buttonDisabled () {
            return this.disabled || !this.instance?.settings?.dashboard2UI
        },
        dashboardURL () {
            if (this.buttonDisabled) {
                return null
            }
            // The dashboard url will *always* be relative to the root as we
            // do not expose `httpNodeRoot` to customise the base path
            const baseURL = new URL(removeSlashes(this.instance.url, false, true))
            baseURL.pathname = removeSlashes(this.instance.settings.dashboard2UI, true, false)
            return baseURL.toString()
        },
        target () {
            return '_db2_' + (this.instance?.id || '')
        },
        isEmbedded () {
            return this.scope === 'team' || this.scope === 'application'
        },
        viewerRoute () {
            const teamSlug = this.contextStore.team?.slug
            if (!teamSlug || !this.instance?.id) {
                return null
            }
            if (this.scope === 'application') {
                const applicationId = this.instance.application?.id || this.contextStore.application?.id
                if (!applicationId) {
                    return null
                }
                return { name: 'application-dashboards-view', params: { team_slug: teamSlug, id: applicationId, instanceId: this.instance.id } }
            }
            return { name: 'team-dashboards-view', params: { team_slug: teamSlug, instanceId: this.instance.id } }
        },
        dropdownOptions () {
            return [
                { name: 'Open Direct URL', action: this.openDashboard }
            ]
        }
    },
    methods: {
        openPrimary (evt) {
            if (this.isEmbedded) {
                return this.openEmbedded(evt)
            }
            return this.openDashboard()
        },
        openEmbedded (evt) {
            if (this.buttonDisabled || !this.viewerRoute) {
                return
            }
            this.navigateTo(this.viewerRoute, evt)
        },
        openDashboard () {
            if (this.buttonDisabled) {
                return
            }
            this.openInANewTab(this.dashboardURL, this.target)
        }
    }
}
</script>

<style scoped lang="scss">
// Container query for drawer context - responsive button behavior
// Breakpoint matches DRAWER_MOBILE_BREAKPOINT constant in Editor/index.vue
// When inside drawer, respond to drawer width instead of viewport
@container drawer (min-width: 640px) {
  .dashboard-link-text {
    display: inline;
  }
}

@container drawer (max-width: 639px) {
  .dashboard-link-text {
    display: none;
  }
}
</style>
