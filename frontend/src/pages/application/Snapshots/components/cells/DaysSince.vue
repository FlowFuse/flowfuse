<template>
    <span>{{ since }}</span>
</template>

<script>
import daysSince from '../../../../../utils/daysSince.js'

export default {
    name: 'DaysSince',
    props: {
        date: {
            required: true,
            type: String
        }
    },
    computed: {
        since: function () {
            return daysSince(this.date)
        }
    }
}
</script>
