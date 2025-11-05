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
                    <div class="resource-icon-placeholder">
                        <svg v-if="resource.type === 'docs'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <svg v-else-if="resource.type === 'blog'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        <svg v-else-if="resource.type === 'video'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </div>
                    <div class="resource-info">
                        <div class="resource-type">{{ formatResourceType(resource.type) }}</div>
                        <div class="resource-title">{{ resource.title }}</div>
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
        formatResourceType (type) {
            // Capitalize first letter and handle special cases
            if (!type) return 'Resource'
            return type.charAt(0).toUpperCase() + type.slice(1)
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
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background-color: white;
        border: 1px solid $ff-grey-200;
        border-radius: 0.5rem;
        text-decoration: none;
        color: $ff-grey-900;
        transition: all 0.2s ease;

        &:hover {
            border-color: $ff-indigo-300;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
    }

    .resource-icon-placeholder {
        flex-shrink: 0;
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: $ff-indigo-600;

        svg {
            width: 1.25rem;
            height: 1.25rem;
        }
    }

    .resource-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        min-width: 0;
    }

    .resource-type {
        font-size: 0.75rem;
        font-weight: 600;
        color: $ff-indigo-600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .resource-title {
        font-size: 0.875rem;
        font-weight: 500;
        color: $ff-grey-900;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>
