<template>
    <ff-button
        v-if="!hidden"
        type="anchor"
        kind="secondary"
        data-action="open-dashboard"
        :to="dashboardURL"
        :target="target"
        :disabled="buttonDisabled"
        class="whitespace-nowrap"
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

import { removeSlashes } from '../../../composables/String.js'

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
    }
}
</script>
