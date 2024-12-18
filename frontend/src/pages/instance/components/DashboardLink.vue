<template>
    <ff-button
        v-if="!hidden"
        kind="secondary"
        data-action="open-dashboard"
        :disabled="buttonDisabled"
        class="whitespace-nowrap"
        @click="openDashboard"
    >
        <template v-if="showText" #icon-left>
            <ChartPieIcon />
        </template>
        <template v-else #icon>
            <ChartPieIcon />
        </template>
        <template v-if="showText">
            Dashboard
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
