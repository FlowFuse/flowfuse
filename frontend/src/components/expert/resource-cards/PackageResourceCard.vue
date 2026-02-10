<template>
    <a
        :href="addUTMTracking(getPackageUrl(nodePackage))"
        target="_blank"
        rel="noopener noreferrer"
        class="package-card"
    >
        <img
            :src="getFaviconUrl(nodePackage.metadata?.source || nodePackage.url)"
            alt="Node-RED"
            class="package-favicon"
            @error="handleImageError"
        >
        <div class="package-info">
            <div class="package-name">{{ getPackageName(nodePackage) }}</div>
            <div class="package-url">{{ getPackageUrl(nodePackage) }}</div>
            <div class="package-actions">
                <template v-if="canManagePalette && !isCorePackage(nodePackage)">
                    <ff-button v-if="isPackageInstalled(nodePackage)" class="w-20" size="small" kind="secondary" @click.stop.prevent="managePackage(nodePackage)">Manage</ff-button>
                    <ff-button v-else class="w-20" size="small" kind="secondary" @click.stop.prevent="installPackage(nodePackage)">Install</ff-button>
                </template>
            </div>
        </div>
    </a>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'

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
        ...mapActions('product/assistant', ['installNodePackage', 'manageNodePackage']),
        getPackageName (pkg) {
            // Handle both object format {id: "..." or name: "..."} and string format
            return typeof pkg === 'object' ? (pkg.id || pkg.name) : pkg
        },
        getPackageUrl (pkg) {
            if (!pkg) return 'https://flows.nodered.org/'
            return pkg.url || pkg.metadata?.source || pkg.metadata?.url || `https://flows.nodered.org/node/${this.getPackageName(pkg)}`
        },
        getFaviconUrl (url) {
            try {
                const urlObj = new URL(url)
                return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`
            } catch (e) {
                // If URL parsing fails, return empty string to trigger error handler
                return 'flows.nodered.org'
            }
        },
        isPackageInstalled (pkg) {
            return !!this.$store.state.product.assistant?.palette?.[pkg.id]
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
        },
        installPackage (nodePackage) {
            const packageName = this.getPackageName(nodePackage)
            this.installNodePackage(packageName)
            // TODO: hide the ff-expert panel after installing. Ideally after a "success" message is received from the assistant
        },
        managePackage (nodePackage) {
            const packageName = this.getPackageName(nodePackage)
            this.manageNodePackage(packageName)
            // TODO: hide the ff-expert panel after managing. Ideally after a "success" message is received from the assistant
        },
        isCorePackage (nodePackage) {
            return nodePackage.type === 'core-node' || this.getPackageName(nodePackage).startsWith('node-red:')
        }
    }
}
</script>

<style scoped lang="scss">
.package-card {
    position: relative;
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
    vertical-align: middle;
    margin-right: 0.5rem;
}

.package-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
.package-actions {
    position: absolute;
    top: 8px;
    right: 8px;
}

.package-name {
    padding-right: 3rem;
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
