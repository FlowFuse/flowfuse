<template>
    <div v-if="!hidden" class="flex justify-end">
        <DashboardLink :disabled="disabled" :disabledReason="disabledReason" :instance="instance" />
    </div>
</template>

<script>
import DashboardLink from '../DashboardLink.vue'

export default {
    name: 'DashboardLinkCell',
    components: { DashboardLink },
    inheritAttrs: false,
    props: {
        instance: {
            default: null,
            type: Object
        },
        disabled: {
            default: false,
            type: Boolean
        },
        disabledReason: {
            default: null,
            type: String
        },
        hidden: {
            default: false,
            type: Boolean
        }
    }
}
</script>
