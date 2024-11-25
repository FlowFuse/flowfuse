<template>
    <div class="has-more item-wrapper" data-el="has-more-tile">
        <router-link :to="linkTo">
            <span>
                {{ remaining }}
                More...
            </span>
            <ChevronRightIcon class="ff-icon" />
        </router-link>
    </div>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/solid'

export default {
    name: 'HasMoreTile',
    components: { ChevronRightIcon },
    props: {
        application: {
            type: Object,
            required: true
        },
        remaining: {
            type: Number,
            required: true
        },
        linkTo: {
            type: Object,
            required: true
        }
    }
}
</script>
