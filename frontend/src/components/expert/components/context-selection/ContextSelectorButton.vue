<template>
    <div class="context-selector mr-2">
        <ff-listbox
            v-model="selectedContextItems"
            class="context-selector"
            :class="hasSelection ? 'active' : ''"
            :options="contextOptions"
            :disabled="!hasContextOptions"
            :hide-chevron="true"
            :icon-only="true"
            return-model
            label-key="label"
            placeholder="Context"
            open-above
            :options-min-width="250"
            align-right
            @option-selected="selectItem"
        >
            <template #icon>
                <PaperClipIcon class="icon ff-icon ff-icon-sm" />
            </template>
        </ff-listbox>
    </div>
</template>

<script>

import { Bars4Icon, CubeIcon, DocumentIcon, PaperClipIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'

import { pluralize } from '../../../../composables/strings/String.js'

import { useProductAssistantStore } from '@/stores/product-assistant.js'

export default {
    name: 'ContextSelectorButton',
    components: {
        PaperClipIcon
    },
    data () {
        return {
            selectedContextItems: []
        }
    },
    computed: {
        ...mapState(useProductAssistantStore, ['availableContextOptions', 'getSelectedContext']),
        hasContextOptions () {
            return this.contextOptions?.length > 0
        },
        hasSelection () {
            return this.selectedContext?.length > 0
        },
        selectedContext () {
            return this.getSelectedContext
        },
        contextOptions: {
            get () {
                // augment options with icons
                const ac = this.availableContextOptions.map(option => {
                    let icon = DocumentIcon
                    if (option.menuIcon === 'CubeIcon') {
                        icon = CubeIcon
                    } else if (option.menuIcon === 'Bars4Icon') {
                        icon = Bars4Icon
                    }
                    return {
                        ...option,
                        icon
                    }
                })
                return ac
            }
        }
    },
    methods: {
        pluralize,
        ...mapActions(useProductAssistantStore, ['setSelectedContext']),
        selectItem (option) {
            if (option.onSelectAction) {
                useProductAssistantStore()[option.onSelectAction]()
            } else {
                const cleanOption = (option) => ({
                    value: option.value,
                    name: option.name,
                    label: option.label,
                    icon: option.icon
                })
                const cleanedOption = cleanOption(option)
                const currentSelection = this.selectedContext || []
                const exists = currentSelection.some(c => c.value === cleanedOption.value)
                if (exists) {
                    return // already selected, do nothing
                }
                this.setSelectedContext([...currentSelection, cleanedOption].filter(Boolean))
            }
        }
    }
}
</script>

<style lang="scss">
.context-selector {
    .ff-listbox {
        min-width: auto;

        .ff-options {
            max-width: 320px;
        }

        button.ff-button {
            border: 1px solid var(--ff-color-accent-light); // indigo-300 to match other buttons
            border-radius: 5px;
            padding: 0.25rem 0.50rem;
            background: var(--ff-color-bg-app);
            color: var(--ff-color-text); // gray-800, explicit dark text
            font-size: 0.875rem;

            .icon {
                svg {
                    color: inherit;
                    width: 1.25rem;
                    height: 1.25rem;
                }
            }

            &:hover:not(:disabled) {
                background-color: var(--ff-color-bg-surface); // gray-50
            }

            &:focus:not(:disabled) {
                outline: none;
                background-color: var(--ff-color-accent-surface); // indigo-100
                color: var(--ff-color-accent-hover); // indigo-700
            }

            &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        }

        &[data-headlessui-state="open"] {
            button.ff-button,
            button.ff-button:hover {
                background: var(--ff-color-accent);
                border-color: var(--ff-color-accent);
                color: var(--ff-color-text-on-brand);

                .icon {
                    svg {
                        color: var(--ff-color-text-on-brand);
                    }
                }
            }
        }
    }
}

.context-selector.active .relative button {
    background-color: var(--ff-color-accent-surface); // indigo-100
}
</style>
