<template>
    <ff-button
        v-if="!hidden"
        kind="secondary"
        data-action="open-dashboard"
        :disabled="buttonDisabled"
        @click.stop="openDashboard()"
    >
        <template #icon-right>
            <ExternalLinkIcon />
        </template>
        Dashboard
    </ff-button>
</template>

<script>
import { ExternalLinkIcon } from '@heroicons/vue/solid'

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
    components: { ExternalLinkIcon },
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
            const url = `${removeSlashes(this.instance.url, false, true)}/${removeSlashes(this.instance.settings.dashboard2UI, true, false)}`
            const fixedTarget = '_db2_' + this.instance.id
            window.open(url, fixedTarget)
        }
    }
}
</script>
