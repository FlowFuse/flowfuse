<template>
    <div class="flex items-center">
        <div v-if="autoRenews" :title="autoRenewsTooltip" style="cursor:help">{{ autoRenewsLabel }}</div>
        <div v-else>{{ expires }}</div>
    </div>
</template>
<script>
import elapsedTime from '../../../utils/elapsedTime.ts'

export default {
    name: 'ExpiryCell',
    props: {
        expiresAt: {
            type: String,
            default: null
        },
        autoRenews: {
            type: Object,
            default: null
        }
    },
    computed: {
        expires: function () {
            if (this.expiresAt) {
                const d = new Date(Date.parse(this.expiresAt))
                return d.toLocaleDateString()
            } else {
                return 'Never'
            }
        },
        untilDate: function () {
            return new Date(this.autoRenews.until).toLocaleDateString()
        },
        autoRenewsLabel: function () {
            if (this.autoRenews.chosen) {
                return `Auto-renews until ${this.untilDate}`
            }
            return 'Auto-renews'
        },
        autoRenewsTooltip: function () {
            const cycle = elapsedTime(this.autoRenews.every, 0)
            const ending = this.autoRenews.chosen
                ? `Access ends on ${this.untilDate}.`
                : `It lapses on ${this.untilDate} if unused.`
            return `This is an agent connection. Its access token renews automatically every ${cycle} while in use. ${ending} Delete this entry to revoke access now.`
        }
    }
}
</script>
