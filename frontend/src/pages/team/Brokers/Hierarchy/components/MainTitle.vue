<template>
    <div class="title mb-2 flex gap-2 items-center">
        <ShareIcon v-if="!icon" class="ff-icon-sm" aria-label="tree-icon" />
        <h3 class="my-2 grow" data-el="subtitle">{{ title }}</h3>
        <div class="flex items-center gap-2">
            <slot name="actions" />
        </div>
    </div>
</template>

<script>
import { ShareIcon } from '@heroicons/vue/24/outline'

export default {
    name: 'MainTitle',
    components: { ShareIcon },
    props: {
        title: {
            type: String,
            required: true
        },
        icon: {
            type: Function,
            required: false,
            default: null
        }
    }
}
</script>

<style scoped lang="scss">

</style>
