<template>
    <div class="ff-expert-rich-resources">
        <!-- Title -->
        <div class="resources-header">
            <h3 class="resources-title">{{ resources.title }}</h3>
            <p v-if="resources.content" class="resources-content">{{ resources.content }}</p>
        </div>

        <!-- Resources List -->
        <div v-if="resources.resources && resources.resources.length > 0" class="resources-list">
            <div class="resources-grid">
                <a
                    v-for="(resource, index) in resources.resources"
                    :key="index"
                    :href="addUTMTracking(resource.url)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="resource-card"
                >
                    <img
                        :src="getFaviconUrl(resource.url)"
                        :alt="resource.type"
                        class="resource-icon"
                        @error="handleImageError"
                    >
                    <div class="resource-info">
                        <div class="resource-title">{{ resource.title }}</div>
                        <div class="resource-url">{{ resource.url }}</div>
                    </div>
                </a>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ExpertRichResources',
    props: {
        resources: {
            type: Object,
            required: true,
            validator: (resources) => {
                return resources.title !== undefined && resources.resources !== undefined
            }
        }
    },
    methods: {
        getFaviconUrl (url) {
            try {
                const urlObj = new URL(url)
                return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`
            } catch (e) {
                // If URL parsing fails, return empty string to trigger error handler
                return ''
            }
        },
        addUTMTracking (url) {
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
        },
        handleImageError (event) {
            // Hide broken image icon
            event.target.style.display = 'none'
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-rich-resources {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.resources-header {
    margin-bottom: 1rem;

    .resources-title {
        font-size: 1.125rem; // text-lg
        font-weight: 600; // font-semibold
        color: #111827; // text-gray-900
        margin: 0 0 0.5rem 0; // mb-2
        line-height: 1.3;
    }

    .resources-content {
        color: #374151; // text-gray-700
        margin: 0;
        line-height: 1.5;
        font-size: 0.9375rem;
    }
}

.resources-list {
    .resources-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

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
    }

    .resource-url {
        font-size: 0.75rem;
        color: $ff-grey-500;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>
