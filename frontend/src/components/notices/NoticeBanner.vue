<template>
    <div class="notice flex gap-4 items-center">
        <div>
            <ExclamationIcon class="ff-icon ff-icon-lg text-yellow-500" />
        </div>
        <slot>
            <p>
                {{ text }}
            </p>
        </slot>
    </div>
</template>

<script>
import { ExclamationIcon } from '@heroicons/vue/outline'

export default {
    name: 'NoticeBanner',
    components: { ExclamationIcon },
    props: {
        text: {
            type: String,
            required: false,
            default: ''
        }
    }
}
</script>

<style scoped lang="scss">
.notice {
    border: 1px solid $ff-yellow-100;
    background-color: $ff-yellow-10;
    border-radius: $ff-unit-sm;
    padding: $ff-unit-md;
}
</style>
