<template>
    <div class="suggestions">
        <h4><information-circle-icon class="ff-icon" /> Suggestions</h4>
        <ul>
            <li v-for="suggestion in suggestions" :key="suggestion">{{ sanitize(suggestion) }}</li>
        </ul>
    </div>
</template>

<script>
import { InformationCircleIcon } from '@heroicons/vue/solid'

import { sanitize } from '../../../../../../composables/strings/String.js'

export default {
    name: 'SuggestionsList',
    components: { InformationCircleIcon },
    props: {
        suggestions: {
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
.suggestions {
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
