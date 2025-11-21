<template>
    <!-- todo clean resource.url references after transitioning to v4 api -->
    <a
        :href="addUTMTracking(resource.metadata?.source || resource.url)"
        target="_blank"
        rel="noopener noreferrer"
        class="resource-card"
    >
        <img
            :src="getFaviconUrl(resource.metadata?.source || resource.url)"
            :alt="resource.type"
            class="resource-icon"
            @error="handleImageError"
        >
        <div class="resource-info">
            <div class="resource-title">{{ resource.title }}</div>
            <div class="resource-url">{{ resource.metadata?.source || resource.url }}</div>
        </div>
    </a>
</template>

<script>
export default {
    name: 'StandardResourceCard',
    props: {
        resource: {
            type: Object,
            required: true
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
        getFaviconUrl (url) {
            try {
                const urlObj = new URL(url)
                return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`
            } catch (e) {
                // If URL parsing fails, return empty string to trigger error handler
                return ''
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
.resource-card {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: white;
    border: 1px solid var(--ff-grey-200);
    border-radius: 0.5rem;
    text-decoration: none;
    color: var(--ff-grey-900);
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--ff-indigo-300);
        background-color: var(--ff-grey-50);
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
    color: var(--ff-grey-900);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.resource-url {
    font-size: 0.75rem;
    color: var(--ff-grey-50)0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
