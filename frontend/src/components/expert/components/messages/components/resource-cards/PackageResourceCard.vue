<template>
    <a
        :href="urlWithUTMTracking"
        target="_blank"
        rel="noopener noreferrer"
        class="package-card"
    >
        <img
            :src="packageFaviconUrl"
            alt="Node-RED"
            class="package-favicon"
            @error="handleImageError"
        >
        <div class="package-info">
            <div class="package-name">
                <streamable-content v-model="streamablePackageName" :should-stream="shouldStream" />
            </div>
            <div class="package-url">
                <streamable-content
                    v-if="!shouldStream || streamablePackageName.streamed"
                    v-model="streamablePackageUrl"
                    :should-stream="shouldStream"
                />
            </div>
            <div class="package-actions">
                <template v-if="canManagePalette && !isCorePackage">
                    <ff-button
                        v-if="isPackageInstalled" class="w-20" size="small" kind="secondary"
                        @click.stop.prevent="managePackage(nodePackage)"
                    >Manage
                    </ff-button>
                    <ff-button
                        v-else class="w-20" size="small" kind="secondary"
                        @click.stop.prevent="installPackage(nodePackage)"
                    >Install
                    </ff-button>
                </template>
            </div>
        </div>
    </a>
</template>

<script>

import { mapActions } from 'pinia'
import { computed } from 'vue'
import { mapGetters } from 'vuex'

import StreamableContent from '../resources/StreamableContent.vue'

import { useProductAssistantStore } from '@/stores/product-assistant.js'

export default {
    name: 'PackageResourceCard',
    components: { StreamableContent },
    props: {
        nodePackage: {
            type: Object,
            required: true
        },
        shouldStream: {
            type: Boolean,
            default: false
        }
    },
    emits: ['streaming-complete'],
    setup (props) {
        const packageName = computed(() => {
            // Handle both object format {id: "..." or name: "..."} and string format
            const pkg = props.nodePackage
            return typeof pkg === 'object' ? (pkg.id.streamable || pkg.name.streamable) : pkg
        })
        const packageUrl = computed(() => {
            const pkg = props.nodePackage
            if (!pkg) return 'https://flows.nodered.org/'
            return pkg.url.streamable || pkg.metadata?.streamable?.source || pkg.metadata?.streamable?.url || `https://flows.nodered.org/node/${packageName.value}`
        })
        return { packageName, packageUrl }
    },
    data () {
        return {
            streamablePackageName: {
                streamable: this.packageName,
                streamed: false
            },
            streamablePackageUrl: {
                streamable: this.packageUrl,
                streamed: false
            }

        }
    },
    computed: {
        ...mapGetters('product/expert', ['canManagePalette']),
        packageFaviconUrl () {
            const url = this.nodePackage.metadata?.streamable?.source || this.nodePackage.url.streamable
            try {
                const urlObj = new URL(url)
                return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`
            } catch (e) {
                // If URL parsing fails, return empty string to trigger error handler
                return 'flows.nodered.org'
            }
        },
        isCorePackage () {
            const pkg = this.nodePackage
            return pkg.type.streamable === 'core-node' || this.packageName.startsWith('node-red:')
        },
        isPackageInstalled () {
            const pkg = this.nodePackage

            return !!useProductAssistantStore().palette?.[pkg.id.streamable]
        },
        urlWithUTMTracking () {
            const url = this.packageUrl
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
        streamablePackageUrl (streamablePackageUrl) {
            // watching the streamablePackageUrl only because it's the last local prop we need to stream, when finished we can
            // let the parent know that streaming is done
            if (streamablePackageUrl.streamed) {
                this.$emit('streaming-complete')
            }
        }
    },
    methods: {
        ...mapActions(useProductAssistantStore, ['installNodePackage', 'manageNodePackage']),
        handleImageError (event) {
            // Hide broken image icon
            event.target.style.display = 'none'
        },
        installPackage () {
            this.installNodePackage(this.packageName)
            // TODO: hide the ff-expert panel after installing. Ideally after a "success" message is received from the assistant
        },
        managePackage () {
            this.manageNodePackage(this.packageName)
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
