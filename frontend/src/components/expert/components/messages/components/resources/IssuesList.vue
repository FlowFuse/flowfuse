<template>
    <div class="issues">
        <h4><exclamation-icon class="ff-icon" /> Issues</h4>
        <ul>
            <li v-for="issue in issues" :key="issue">{{ sanitize(issue) }}</li>
        </ul>
    </div>
</template>

<script>
import { ExclamationIcon } from '@heroicons/vue/solid'

import { sanitize } from '../../../../../../composables/strings/String.js'

export default {
    name: 'SuggestionsList',
    components: { ExclamationIcon },
    props: {
        issues: {
            type: Array,
            required: true
        }
    },
    setup () {
        return { sanitize }
    }
}
</script>

<style scoped lang="scss">
.issues {
    margin-top: 1.25rem;

    h4 {
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 5px;
        color: $ff-grey-600;

        .ff-icon {
            color: $ff-grey-500;
        }
    }

    ul {
        list-style: disc;
        padding-left: 1.4rem;

        li {
            margin-top: .5rem;
        }
    }
}
</style>
