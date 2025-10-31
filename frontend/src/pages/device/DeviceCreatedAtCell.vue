<template>
    <span :title="formattedDate" class="cursor-default">{{ createdSince }}</span>
</template>

<script>
import daysSince from '../../utils/daysSince.js'

export default {
    name: 'DeviceCreatedAtCell',
    props: {
        createdAt: {
            type: String,
            required: true
        }
    },
    computed: {
        createdSince () {
            return `${daysSince(this.createdAt, true)}`
        },
        formattedDate () {
            return new Date(this.createdAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            })
        }
    }

}
</script>

<style scoped lang="scss">

</style>
