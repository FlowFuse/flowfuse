<template>
    <div
        v-if="assistantState.show"
        class="info-banner update-banner"
        :class="assistantState.statusClass"
    >
        <div class="update-banner-text update-banner-header flex items-center justify-between">
            <span class="truncate flex-1 pr-4" :title="assistantState.title">
                {{ assistantState.title }}
            </span>
            <span class="update-banner-badge ml-4 flex-shrink-0">{{ assistantState.chip }}</span>
        </div>
        <div class="update-banner-text update-banner-body" tabindex="0">
            <p class="mb-2">{{ assistantState.body }}</p>
            <div class="flex justify-end">
                <ff-button
                    kind="secondary"
                    size="small"
                    @click="onButtonClick"
                >
                    {{ assistantState.buttonText }}
                </ff-button>
            </div>
        </div>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'
import SemVer from 'semver'

import { useProductAssistantStore } from '@/stores/product-assistant.js'

const assistantVerWithAvailableUpdatesSupport = '0.11.0' // Minimum version of assistant package that supports update available detection
const nrVerWithAvailableUpdatesSupport = '4.1.6' // Minimum Node-RED version that provides available updates to editorState

export default {
    name: 'UpdateBanner',
    computed: {
        ...mapState(useProductAssistantStore, ['palette', 'editorState', 'version', 'nodeRedVersion', 'supportedActions', 'isEditorRunning']),
        assistantLoaded () {
            // If one of version, nodeRedVersion or palette are present, we know it is loaded
            return !!(this.version || this.nodeRedVersion || this.palette)
        },
        assistantPackage () {
            if (!this.palette || Object.keys(this.palette).length === 0) {
                return null // Palette not loaded yet
            }
            if (!this.palette?.['@flowfuse/nr-assistant']) {
                return { installed: false }
            }
            return { installed: true, ...this.palette['@flowfuse/nr-assistant'] }
        },
        availableUpdate () {
            if (Array.isArray(this.editorState?.updatesAvailable?.palette)) {
                return this.editorState?.updatesAvailable?.palette?.find(update => update.package === '@flowfuse/nr-assistant')
            }
            return null
        },
        assistantState () {
            if (!this.version || SemVer.lt(this.version, '0.10.1')) {
                // this version does not support the dynamic events we rely on to determine if the editor is running
                // so let the below logic determine if an update is available.
            } else if (!this.isEditorRunning) {
                return { show: false }
            }

            const enabled = this.assistantPackage?.enabled !== false
            const installed = this.assistantPackage?.installed ?? this.assistantLoaded // default to installed if loaded.
            const installedVersion = (installed ? this.assistantPackage?.version : '') || this.version || '0.0.0'
            const nrSupportsUpdateInfo = SemVer.gte(this.nodeRedVersion || '0.0.0', nrVerWithAvailableUpdatesSupport)
            const nrAvailableUpdatesSupported = nrSupportsUpdateInfo && !!this.availableUpdate
            let isUpdateAvailable = !!this.availableUpdate?.latest // presence alone indicates and update is available!
            if (this.assistantLoaded && !nrAvailableUpdatesSupported) {
                // If we don't have explicit Available Updates data from NR, we can still against min supported version!
                isUpdateAvailable = SemVer.lt(installedVersion, assistantVerWithAvailableUpdatesSupport)
            }

            const state = {
                show: (!installed || !enabled || isUpdateAvailable),
                statusClass: '',
                expectedVersion: this.availableUpdate?.latest || assistantVerWithAvailableUpdatesSupport,
                installedVersion,
                installed,
                enabled,
                chip: '',
                title: '',
                body: '',
                buttonText: '',
                buttonAction: null
            }
            if (!installed) {
                state.statusClass = 'warning'
                state.chip = 'Not installed'
                state.title = 'FlowFuse Expert Not Installed'
                state.body = 'FlowFuse Expert is not installed in the Node-RED palette. Please install it to access its features.'
                state.buttonText = 'Install...'
                state.buttonAction = this.installAssistantPackage
            } else if (!enabled) {
                state.statusClass = 'warning'
                state.chip = 'Not enabled'
                state.title = 'FlowFuse Expert Not Enabled'
                state.body = 'FlowFuse Expert is installed but not enabled in the Node-RED palette. Please enable it to access its features.'
                state.buttonText = 'Enable...'
                state.buttonAction = this.manageAssistantPackage
            } else if (isUpdateAvailable) {
                state.statusClass = ''
                state.chip = this.availableUpdate?.latest ? `V${this.availableUpdate.latest} available` : 'Update available'
                state.title = 'New FlowFuse Expert Version Available'
                state.body = 'There is an update available for FlowFuse Expert in the Node-RED palette. Please update to the latest version to enjoy new features and improvements.'
                state.buttonText = 'Update...'
                state.buttonAction = this.manageAssistantPackage
            } else {
                state.show = false
            }
            return state
        }
    },
    methods: {
        ...mapActions(useProductAssistantStore, ['manageNodePackage', 'installNodePackage']),
        onButtonClick () {
            if (typeof this.assistantState?.buttonAction === 'function') {
                this.assistantState.buttonAction()
            }
        },
        manageAssistantPackage () {
            this.manageNodePackage('@flowfuse/nr-assistant')
        },
        installAssistantPackage () {
            this.installNodePackage('@flowfuse/nr-assistant')
        }
    }
}
</script>

<style lang="scss" scoped>
.update-banner {
    background-color: #eef2ff; // indigo-100
    margin-bottom: 0rem;
    border-radius: 0;
    padding: 0.5rem 1rem;
    border-top: 1px solid #E5E7EB;

    .update-banner-text {
        color: #4338ca; // indigo-700
        font-size: 0.875rem;
        margin: 0;
        line-height: 1.5;
    }

    .update-banner-header {
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .update-banner-body {
        max-height: 0;
        overflow: hidden;
        visibility: hidden;
        transition: max-height 0.6s ease-in-out, visibility 0.6s ease-in-out;
        transition-delay: 250ms; // avoid showing immediately (minimise false expansion on mousing around the chat)
    }

    .update-banner-badge {
        display: inline-block;
        background-color: #818cf8; // indigo-400
        color: white;
        font-weight: 600;
        border-radius: 0.25rem;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        cursor: default;
        vertical-align: text-top;
        padding: 0.125rem 0.5rem;
        font-size: 0.75rem;
    }

    &.warning {
        .update-banner-badge {
            background-color: $ff-red-700;
            color: $ff-grey-50;
        }
    }

    &:hover .update-banner-body,
    &:focus-within .update-banner-body,
    &:active .update-banner-body {
        max-height: 500px;
        visibility: visible;
    }
}
</style>
