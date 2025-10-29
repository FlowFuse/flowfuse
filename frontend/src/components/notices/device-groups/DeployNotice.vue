<template>
    <notice-banner>
        <div v-if="targetSnapshot" class="deploy-notice">
            <h5 class="mb-2">{{ title }}</h5>

            <p class="clipped-overflow cursor-default mb-1" :title="targetSnapshot.name">{{ targetSnapshot.name }}</p>

            <p class="text-sm italic text-gray-400 flex gap-2">
                <span>Created at:</span>
                <span class="cursor-default" :title="createdSince">{{ readableCreatedAt }}</span>
            </p>
        </div>

        <p v-else>{{ defaultText }}</p>
    </notice-banner>
</template>

<script>
import { useDateHelpers } from '../../../composables/DateHelpers.js'
import daysSince from '../../../utils/daysSince.js'
import NoticeBanner from '../NoticeBanner.vue'

export default {
    name: 'DeployNotice',
    components: { NoticeBanner },
    props: {
        defaultText: {
            required: false,
            default: 'This Remote Instance will be updated to deploy the selected groups active pipeline snapshot',
            type: String
        },
        targetSnapshot: {
            required: false,
            default: null,
            type: Object
        },
        title: {
            type: String,
            required: false,
            default: 'The below snapshot will be deployed to the selected device(s):'
        }
    },
    setup () {
        const { humanReadableDate } = useDateHelpers()

        return { humanReadableDate }
    },
    computed: {
        readableCreatedAt () {
            return this.humanReadableDate(this.targetSnapshot.createdAt)
        },
        createdSince () {
            return daysSince(this.targetSnapshot.createdAt)
        }
    }
}
</script>

<style scoped lang="scss">

</style>
