<template>
    <i class="ff-icon ff-icon-lg">
        <CheckIcon v-if="value" class="ff-icon ff-icon-lg" />
    </i>
</template>

<script>

import { CheckIcon } from '@heroicons/vue/outline'

export default {
    name: 'ff-check',
    components: {
        CheckIcon
    },
    props: {
        value: {
            default: false,
            type: Boolean
        }
    }
}
</script>
