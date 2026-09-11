<template>
    <ff-dialog
        ref="dialog"
        header="Connect your AI agent to FlowFuse"
        box-class="max-w-[64rem]! w-full!"
    >
        <template #default>
            <div class="ff-agent-card">
                <div class="ff-agent-tabs" role="tablist" aria-label="Choose your AI agent">
                    <button
                        v-for="client in clients"
                        :id="`ff-tab-${client.id}`"
                        :key="client.id"
                        type="button"
                        role="tab"
                        class="ff-agent-tab"
                        :class="{ 'ff-agent-tab--active': activeClient === client.id }"
                        :aria-controls="`ff-panel-${client.id}`"
                        :aria-selected="activeClient === client.id"
                        @click="selectClient(client.id)"
                    >
                        <ServerIcon v-if="client.icon" class="ff-agent-tab__glyph" aria-hidden="true" />
                        <img v-else :src="client.logo" alt="" aria-hidden="true">
                        <span>{{ client.name }}</span>
                    </button>
                </div>

                <div
                    v-for="client in clients"
                    v-show="activeClient === client.id"
                    :id="`ff-panel-${client.id}`"
                    :key="`panel-${client.id}`"
                    role="tabpanel"
                    :aria-labelledby="`ff-tab-${client.id}`"
                    class="ff-agent-panel"
                >
                    <div class="ff-agent-step">
                        <p class="ff-agent-step__num">01</p>
                        <p class="ff-agent-step__title">Copy the FlowFuse connector URL</p>
                        <p class="ff-agent-step__body">Paste it into your agent in the next step.</p>
                        <div class="ff-agent-step__cta">
                            <div class="ai-connector__command">
                                <code class="ai-connector__endpoint">{{ endpoint }}</code>
                                <ff-button kind="primary" size="small" @click="copyEndpoint">
                                    <template #icon-right><ClipboardDocumentIcon /></template>
                                    Copy
                                </ff-button>
                            </div>
                        </div>
                    </div>

                    <div class="ff-agent-step">
                        <p class="ff-agent-step__num">02</p>
                        <p class="ff-agent-step__title">{{ client.step2Title }}</p>
                        <p class="ff-agent-step__body">{{ client.step2Body }}</p>
                        <div class="ff-agent-step__cta">
                            <a
                                :href="client.step2Url"
                                class="ff-agent-step__link"
                                :target="client.step2Url.startsWith('http') ? '_blank' : undefined"
                                :rel="client.step2Url.startsWith('http') ? 'noopener' : undefined"
                                @click="capture('cta-ai-open-client', { position: client.id })"
                            >
                                <span>{{ client.step2Label }}</span>
                                <ArrowTopRightOnSquareIcon class="ff-icon" />
                            </a>
                        </div>
                    </div>

                    <div class="ff-agent-step">
                        <p class="ff-agent-step__num">03</p>
                        <p class="ff-agent-step__title">Sign in and choose what it reaches</p>
                        <p class="ff-agent-step__body">Pick which teams it acts on, and whether it can edit or only read.</p>
                    </div>
                </div>
            </div>
        </template>

        <template #actions>
            <ff-button kind="secondary" @click="openExternal('https://flowfuse.com/docs/user/expert/third-party-agents/')">Read the documentation</ff-button>
            <ff-button kind="secondary" class="mr-auto" @click="openExternal('https://flowfuse.com/ai/')">More about FlowFuse AI</ff-button>
            <ff-button kind="primary" @click="close">Close</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ArrowTopRightOnSquareIcon, ClipboardDocumentIcon, ServerIcon } from '@heroicons/vue/24/outline'

import { mapActions, mapState } from 'pinia'

import clipboardMixin from '../../mixins/Clipboard.js'
import alerts from '../../services/alerts.js'
import product from '../../services/product.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useUxToursStore } from '@/stores/ux-tours.js'

const CLIENTS = [
    {
        id: 'claude',
        logo: '/images/ai/agents/claude.svg',
        name: 'Claude',
        step2Title: 'Add a custom connector',
        step2Body: 'Paste the URL.',
        step2Label: 'Open Claude',
        step2Url: 'https://claude.ai/'
    },
    {
        id: 'copilot',
        logo: '/images/ai/agents/microsoft-copilot.svg',
        name: 'Microsoft Copilot',
        step2Title: 'Copilot Studio, Tools, Add a tool',
        step2Body: 'Pick Model Context Protocol, paste the URL.',
        step2Label: 'Open Copilot Studio',
        step2Url: 'https://copilotstudio.microsoft.com/'
    },
    {
        id: 'chatgpt',
        logo: '/images/ai/agents/chatgpt.svg',
        name: 'ChatGPT',
        step2Title: 'Settings, Apps & Connectors, Advanced settings',
        step2Body: 'Enable developer mode, add by URL. Paid plans only.',
        step2Label: 'Open ChatGPT',
        step2Url: 'https://chatgpt.com/'
    },
    {
        id: 'local',
        icon: true,
        name: 'Local and Custom Agents',
        step2Title: "Your MCP client's config",
        step2Body: 'Any MCP client, pointed at your own model.',
        step2Label: 'See the documentation',
        step2Url: 'https://flowfuse.com/docs/user/expert/'
    }
]

export default {
    name: 'AiConnectorModal',
    components: { ArrowTopRightOnSquareIcon, ClipboardDocumentIcon, ServerIcon },
    mixins: [clipboardMixin],
    data () {
        return {
            clients: CLIENTS,
            activeClient: CLIENTS[0].id
        }
    },
    computed: {
        ...mapState(useUxToursStore, ['isAiConnectorModalOpen', 'shouldAutoShowAiConnectorModal']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        ...mapState(useContextStore, ['team']),
        endpoint () {
            return `${window.location.origin}/mcp`
        },
        isFeatureEnabled () {
            return this.featuresCheck.isAiFeatureEnabled && this.featuresCheck.isMcpThirdPartyFeatureEnabled
        },
        canAutoShow () {
            return this.isFeatureEnabled && !!this.team
        }
    },
    watch: {
        isAiConnectorModalOpen (open) {
            if (open) {
                this.$refs.dialog?.show()
            } else {
                this.$refs.dialog?.close()
            }
        },
        canAutoShow: {
            handler (ready) {
                if (ready && this.shouldAutoShowAiConnectorModal) {
                    this.openAiConnectorModal()
                }
            },
            immediate: true
        }
    },
    mounted () {
        if (this.isAiConnectorModalOpen) {
            this.$refs.dialog.show()
        }
    },
    methods: {
        ...mapActions(useUxToursStore, ['openAiConnectorModal', 'closeModal']),
        capture (event, properties) {
            product.capture(event, properties)
        },
        selectClient (id) {
            this.activeClient = id
            this.capture('cta-ai-agent-tab', { position: id })
        },
        copyEndpoint () {
            this.copyToClipboard(this.endpoint)
                .then(() => {
                    this.capture('cta-copy-mcp-endpoint', { position: this.activeClient })
                    alerts.emit('Copied to Clipboard.', 'confirmation')
                })
                .catch((err) => {
                    console.warn('Clipboard write permission denied: ', err)
                    alerts.emit('Clipboard write permission denied.', 'warning')
                })
        },
        openExternal (url) {
            window.open(url, '_blank', 'noopener')
        },
        close () {
            this.closeModal('aiConnector')
        }
    }
}
</script>

<style scoped lang="scss">
.ff-agent-card {
    container-type: inline-size;
    overflow: hidden;
    border: 1px solid var(--ff-color-border);
    border-radius: 12px;
    background: var(--ff-color-bg-surface);
}

.ff-agent-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 8px;
    border-bottom: 1px solid var(--ff-color-border);
    background: var(--ff-color-bg-surface-raised);
}

.ff-agent-tab {
    display: flex;
    flex: none;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--ff-color-text-subtle);
    transition: background-color .15s, color .15s;

    &:hover {
        background: var(--ff-color-bg-surface);
        color: var(--ff-color-text-default);
    }

    &--active,
    &--active:hover {
        background: var(--ff-color-accent-strong);
        color: var(--ff-color-text-on-brand);
    }

    img {
        height: 16px;
        width: auto;
        flex: none;
    }

    &__glyph {
        height: 16px;
        width: 16px;
        flex: none;
    }
}

.ff-agent-panel {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 24px;
}

.ff-agent-step {
    display: flex;
    flex-direction: column;

    &__num {
        margin: 0;
        font-family: var(--ff-font-mono, monospace);
        font-size: 12px;
        font-weight: 600;
        color: var(--ff-color-accent-strong);
    }

    &__title {
        margin: 8px 0 0;
        font-size: 16px;
        font-weight: 500;
        color: var(--ff-color-text-default);
    }

    &__body {
        margin: 8px 0 0;
        font-size: 14px;
        font-weight: 300;
        line-height: 1.5;
        color: var(--ff-color-text-subtle);
    }

    &__cta {
        margin-top: auto;
        padding-top: 20px;
    }

    &__link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 12px;
        border: 1px solid var(--ff-color-border);
        border-radius: 6px;
        color: var(--ff-color-text-default);

        &:hover {
            text-decoration: none;
            border-color: var(--ff-color-link-hover);
            color: var(--ff-color-link-hover);
        }

        .ff-icon {
            height: 16px;
            width: 16px;
            flex: none;
        }
    }
}

.ai-connector__command {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border: 1px solid var(--ff-color-border);
    border-radius: 6px;
    background: var(--ff-color-bg-surface-raised);
}

.ai-connector__endpoint {
    font-family: var(--ff-font-mono, monospace);
    font-size: 13px;
    white-space: nowrap;
    overflow-x: auto;
    color: var(--ff-color-text-default);
}

@container (min-width: 640px) {
    .ff-agent-panel {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 32px;
    }
}
</style>
