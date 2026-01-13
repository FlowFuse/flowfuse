<template>
    <a
        :href="addUTMTracking(getPackageUrl(nodePackage))"
        target="_blank"
        rel="noopener noreferrer"
        class="package-card"
    >
        <img
            :src="'https://www.google.com/s2/favicons?domain=flows.nodered.org'"
            alt="Node-RED"
            class="package-favicon"
            @error="handleImageError"
        >
        <div class="package-info">
            <div class="package-name">{{ getPackageName(nodePackage) }}</div>
            <div class="package-url">{{ getPackageUrl(nodePackage) }}</div>
        </div>
    </a>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
    name: 'PackageResourceCard',
    props: {
        nodePackage: {
            type: Object,
            required: true
        }
    },
    computed: {
        // todo this is where we should add a button to install a module
        ...mapGetters('product/expert', ['canManagePalette'])
    },
    methods: {
        getPackageName (pkg) {
            // Handle both object format {id: "..." or name: "..."} and string format
            return typeof pkg === 'object' ? (pkg.id || pkg.name) : pkg
        },
        getPackageUrl (pkg) {
            const packageName = this.getPackageName(pkg)
            return `https://flows.nodered.org/node/${packageName}`
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
.package-card {
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

.package-favicon {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    margin-top: 0.125rem;
}

.package-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.package-name {
    font-size: 0.875rem;
    font-weight: 500;
    font-family: monospace;
    color: $ff-grey-900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.package-url {
    font-size: 0.75rem;
    color: $ff-grey-500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0;
}
</style>
