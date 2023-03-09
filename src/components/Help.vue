<template>
    <span v-ff-tooltip:[position]="text" class="ff-help-tooltip ff-icon">
        <QuestionMarkCircleIcon />
    </span>
</template>

<script>

import { QuestionMarkCircleIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-help',
    components: {
        QuestionMarkCircleIcon
    },
    props: {
        text: {
            required: true,
            type: String
        },
        position: {
            default: 'right',
            type: String
        }
    }
}
</script>
