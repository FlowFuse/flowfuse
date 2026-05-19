<template>
    <!-- todo clean resource.url references after transitioning to v4 api -->
    <a
        :href="urlWithUtmTracking"
        target="_blank"
        rel="noopener noreferrer"
        class="resource-card"
    >
        <img
            :src="favIconUrl"
            :alt="resource.type"
            class="resource-icon"
            @error="handleImageError"
        >
        <div class="resource-info">
            <div class="resource-title" :title="resourceTitle.streamable">
                <streamable-content v-model="resourceTitle" :should-stream="shouldStream" />
            </div>
            <div v-if="!shouldStream || resourceTitle.streamed" class="resource-url">
                <streamable-content v-if="resourceMetadataSource" v-model="resourceMetadataSource" :should-stream="shouldStream" />
                <streamable-content v-else-if="resource.url" :string="resourceUrl" :should-stream="shouldStream" />
            </div>
        </div></a>
</template>

<script>
import StreamableContent from '../resources/StreamableContent.vue'

export default {
    name: 'StandardResourceCard',
    components: { StreamableContent },
    props: {
        resource: {
            type: Object,
            required: true
        },
        shouldStream: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    emits: ['streaming-complete'],
    data () {
        return {
            resourceUrl: this.resource.metadata?.streamable.source || this.resource.streamable.url,
            resourceTitle: { ...this.resource.title },
            resourceMetadataSource: this.resource.metadata?.source
        }
    },
    computed: {
        favIconUrl () {
            const url = this.resourceUrl

            try {
                const urlObj = new URL(url)
                return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`
            } catch (e) {
                // If URL parsing fails, return empty string to trigger error handler
                return ''
            }
        },
        urlWithUtmTracking () {
            const url = this.resourceUrl
            try {
                const urlObj = new URL(url)
                urlObj.searchParams.set('utm_source', 'flowfuse-expert')
                urlObj.searchParams.set('utm_medium', 'assistant')
                urlObj.searchParams.set('utm_campaign', 'expert-chat')
                return urlObj.toString()
            } catch (e) {
                // If URL parsing fails, return original
                return url
            }
        }
    },
    watch: {
        resourceTitle (resourceTitle) {
            // watching the resource title only because it's the last local prop we need to stream, when finished we can
            // let the parent know that streaming is done
            if (resourceTitle.streamed) {
                this.$emit('streaming-complete')
            }
        }
    },
    methods: {
        handleImageError (event) {
            // Hide broken image icon
            event.target.style.display = 'none'
        }
    }
}
</script>

<style scoped lang="scss">
.resource-card {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: white;
    border: 1px solid $ff-grey-200;
    border-radius: 0.5rem;
    text-decoration: none;
    color: $ff-grey-900;
    transition: all 0.2s ease;

    &:hover {
        border-color: $ff-indigo-300;
        background-color: $ff-grey-50;
    }
}

.resource-icon {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    margin-top: 0.125rem;
    object-fit: contain;
}

.resource-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
}

.resource-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: $ff-grey-900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    :deep(.streamable-content) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.resource-url {
    font-size: 0.75rem;
    color: $ff-grey-500;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    :deep(.streamable-content) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>
