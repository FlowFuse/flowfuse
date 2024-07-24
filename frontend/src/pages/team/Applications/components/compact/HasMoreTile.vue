<template>
    <div class="has-more item-wrapper" data-el="has-more-tile">
        <router-link :to="{name: linkTo, params: {id: application.id}, query: {searchQuery}}">
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
            type: String,
            required: true
        },
        searchQuery: {
            type: String,
            required: false,
            default: ''
        }
    }
}
</script>

<style scoped lang="scss">

</style>
