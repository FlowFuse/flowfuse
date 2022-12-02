<template>
    <span class="ff-help-tooltip ff-icon" v-ff-tooltip:[position]="text">
        <QuestionMarkCircleIcon />
    </span>
</template>

<script>

import { QuestionMarkCircleIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-help',
    props: {
        text: {
            required: true,
            type: String
        },
        position: {
            default: 'right',
            type: String
        }
    },
    components: {
        QuestionMarkCircleIcon
    }
}
</script>
