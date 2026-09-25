<template>
    <message-bubble type="event" bare>
        <div class="flowfuse-event-card" :class="{ 'flowfuse-event-card--right': alignRight }">
            <span class="flowfuse-event-card__label">FlowFuse Event</span>
            <p class="flowfuse-event-card__body">
                {{ body }}
            </p>
        </div>
    </message-bubble>
</template>

<script>
import MessageBubble from './components/MessageBubble.vue'

const BODY_BY_KIND = {
    'instance-ready' (payload) {
        const name = payload.instance?.name
        return name
            ? `Instance "${name}" has finished starting and is now running.`
            : 'Your instance has finished starting and is now running.'
    }
}

export default {
    name: 'FlowFuseEventCard',
    components: { MessageBubble },
    inject: {
        expertSurface: {
            from: 'expert-surface',
            default: 'drawer'
        }
    },
    props: {
        // eslint-disable-next-line vue/prop-name-casing
        _type: {
            type: String,
            required: true
        },
        kind: {
            type: String,
            required: true
        },
        payload: {
            type: Object,
            default: () => ({})
        },
        // eslint-disable-next-line vue/prop-name-casing
        _timestamp: {
            type: Number,
            required: true
        }
    },
    computed: {
        alignRight () {
            return this.expertSurface !== 'onboarding'
        },
        body () {
            const describe = BODY_BY_KIND[this.kind]
            return describe ? describe(this.payload) : `A "${this.kind}" notification was sent to Expert.`
        }
    }
}
</script>

<style scoped lang="scss">
.flowfuse-event-card {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem;
    border: 1px solid var(--ff-color-border);
    border-radius: 6px;
    background: var(--ff-color-bg-surface);
    max-width: 90%;
}

.flowfuse-event-card--right {
    align-self: flex-end;
}

.flowfuse-event-card__label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ff-color-text-subtle);
}

.flowfuse-event-card__body {
    margin: 0;
    color: var(--ff-color-text);
}
</style>
