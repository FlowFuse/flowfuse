<template>
    <div v-if="!pageLoader" class="flex flex-col flex-1 w-full min-h-0">
        <slot name="header" />
        <main :class="mainClasses">
            <slot name="default" />
        </main>
    </div>
    <ff-loading v-else :message="pageLoaderMessage" />
</template>

<script>
import { mapState } from 'pinia'

import { useUxLoadingStore } from '@/stores/ux-loading.js'

export default {
    name: 'PageLayout',
    props: {
        noPadding: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        ...mapState(useUxLoadingStore, ['pageLoader', 'pageLoaderMessage']),
        mainClasses () {
            const classes = ['flex-1', 'overflow-auto', 'h-full', 'w-full', 'flex', 'flex-col']
            if (!this.noPadding && !this.hasRouteDeclaredNoPadding) {
                classes.push('px-7', 'py-7')
            }
            return classes
        },
        hasRouteDeclaredNoPadding () {
            return this.$route.meta?.noPagePadding ?? false
        }
    }
}
</script>
