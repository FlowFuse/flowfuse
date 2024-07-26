<template>
    <ff-button
        v-if="!hidden"
        kind="secondary"
        data-action="open-dashboard"
        :disabled="buttonDisabled"
        @click.stop="openDashboard()"
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

// utility function to remove leading and trailing slashes
const removeSlashes = (str, leading = true, trailing = true) => {
    if (leading && str.startsWith('/')) {
        str = str.slice(1)
    }
    if (trailing && str.endsWith('/')) {
        str = str.slice(0, -1)
    }
    return str
}

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
        }
    },
    methods: {
        openDashboard () {
            if (this.disabled || !this.instance?.settings?.dashboard2UI) {
                return
            }
            // The dashboard url will *always* be relative to the root as we
            // do not expose `httpNodeRoot` to customise the base path
            const baseURL = new URL(removeSlashes(this.instance.url, false, true))
            baseURL.pathname = removeSlashes(this.instance.settings.dashboard2UI, true, false)
            const fixedTarget = '_db2_' + this.instance.id
            window.open(baseURL.toString(), fixedTarget)
        }
    }
}
</script>
