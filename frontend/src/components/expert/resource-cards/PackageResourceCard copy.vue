<template>
    <a
        :href="addUTMTracking(packageUrl)"
        target="_blank"
        rel="noopener noreferrer"
        class="package-card"
    >
        <img
            :src="faviconUrl"
            alt="Node-RED"
            class="package-favicon"
            @error="handleImageError"
        >
        <div class="package-info">
            <div class="package-name">{{ packageName }}</div>
            <div class="package-url">{{ packageUrl }}</div>
            <div class="package-actions">
                <template v-if="canManagePalette && !isCorePackage">
                    <ff-button v-if="isPackageInstalled" class="w-20" size="small" kind="secondary" @click.stop.prevent="managePackage(nodePackage)">Manage</ff-button>
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
        ...mapGetters('product/expert', ['canManagePalette']),
        isCorePackage () {
            return this.nodePackage.type === 'core-node' || this.getPackageName(this.nodePackage).startsWith('node-red:')
        },
        faviconUrl () {
            const source = this.nodePackage.metadata?.source || this.nodePackage.url
            if (!source) return 'https://flows.nodered.org/favicon.ico'
            try {
                const urlObj = new URL(source)
                return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`
            } catch (e) {
                // If URL parsing fails, return default favicon
                return 'https://flows.nodered.org/favicon.ico'
            }
        },
        packageUrl () {
            if (!this.nodePackage) return 'https://flows.nodered.org/'
            return this.nodePackage.url || this.nodePackage.metadata?.source || this.nodePackage.metadata?.url || `https://flows.nodered.org/node/${this.getPackageName(this.nodePackage)}`
        },
        packageName () {
            // Handle both object format {id: "..." or name: "..."} and string format
            return typeof this.nodePackage === 'object' ? (this.nodePackage.id || this.nodePackage.name) : this.nodePackage
        },
        isPackageInstalled () {
            return !!this.$store.state.product.assistant?.palette?.[this.packageName]
        }
    },
    methods: {
        ...mapActions('product/assistant', ['installNodePackage', 'manageNodePackage']),
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
            const packageName = this.packageName
            this.installNodePackage(packageName)
            // TODO: hide the ff-expert panel after installing. Ideally after a "success" message is received from the assistant
        },
        managePackage (nodePackage) {
            const packageName = this.packageName
            this.manageNodePackage(packageName)
            // TODO: hide the ff-expert panel after managing. Ideally after a "success" message is received from the assistant
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
