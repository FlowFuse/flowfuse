<template>
    <div class="notice flex gap-4 items-center">
        <div class="icon-wrapper text-center">
            <ExclamationIcon class="ff-icon ff-icon-lg text-yellow-500" />
        </div>
        <div class="content-wrapper">
            <slot>
                <h3 v-if="title" class="mb-3">{{ title }}</h3>
                <p>
                    {{ text }}
                </p>
            </slot>
        </div>
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
        },
        title: {
            type: String,
            required: false,
            default: null
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

    .icon-wrapper {
        min-width: 40px;
    }
}
</style>
