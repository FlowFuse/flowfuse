<template>
    <i class="ff-icon ff-icon-lg">
        <CheckIcon v-if="value" class="ff-icon ff-icon-lg" />
    </i>
</template>

<script>

import { CheckIcon } from '@heroicons/vue/outline'

export default {
    name: 'ff-check',
    props: {
        value: {
            default: false,
            type: Boolean
        }
    },
    components: {
        CheckIcon
    }
}
</script>
