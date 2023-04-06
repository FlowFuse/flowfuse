<template>
    <TransitionGroup name="notifications-list">
        <div v-if="!actioned && isValidPayload" class="ff-notifications">
            <div class="ff-notification-interview">
                <h3>{{ payload.invitationTitle }}</h3>
                <p>{{ payload.invitationBody }}</p>
                <div class="ff-notification-interview--actions">
                    <ff-button kind="secondary" @click="dismiss">{{ payload.closeText || 'Close' }}</ff-button>
                    <ff-button kind="primary" @click="book">{{ payload.bookText || 'Book Now' }}</ff-button>
                </div>
            </div>
        </div>
    </TransitionGroup>
</template>

<script>

export default {
    name: 'InterviewPopup',
    props: {
        flag: {
            type: String,
            required: true
        },
        payload: {
            type: Object,
            required: true
        }
    },
    setup (props) {
        const isValidPayload = !!props.payload.invitationTitle && !!props.payload.invitationBody && !!props.payload.bookingLink
        return {
            isValidPayload
        }
    },
    data: function () {
        return {
            actioned: false
        }
    },
    mounted () {
        this.capture('$interview-popup-shown')
    },
    methods: {
        dismiss: function () {
            this.capture('$interview-popup-dismissed')
            this.action()
        },
        book: function () {
            this.capture('$interview-popup-book')
            this.action()
            if (this.payload.bookingLink) {
                window.open(this.payload.bookingLink)
            }
        },
        capture (event) {
            const timestamp = new Date().toISOString()

            window.posthog?.capture(event, {
                $set: {
                    [`$interview-popup-seen - ${this.flag}`]: timestamp,
                    '$interview-popup-seen': timestamp
                },
                featureFlagName: this.flag
            })
        },
        action () {
            const timestamp = new Date().toISOString()
            localStorage.setItem('ph-$interview-popup-seen', timestamp)
            this.actioned = true
        }
    }
}
</script>

<style lang="scss">
@import "../stylesheets/components/notifications.scss";
</style>
