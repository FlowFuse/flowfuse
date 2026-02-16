<template>
    <ff-button
        v-if="!hidden"
        :kind="minimalView ? 'tertiary' : 'secondary'"
        data-action="open-dashboard"
        :disabled="buttonDisabled"
        class="whitespace-nowrap"
        @click.stop="openDashboard"
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
</template>

<script>
import { ChartPieIcon } from '@heroicons/vue/outline'

import { useNavigationHelper } from '../../../composables/NavigationHelper.js'

import { removeSlashes } from '../../../composables/String.js'

const { openInANewTab } = useNavigationHelper()

export default {
    name: 'DashboardLink',
    components: { ChartPieIcon },
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
        }
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
        }
    },
    methods: {
        openDashboard () {
            if (this.buttonDisabled) {
                return
            }
            openInANewTab(this.dashboardURL, this.target)
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
