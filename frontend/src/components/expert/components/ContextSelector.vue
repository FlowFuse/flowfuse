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

import { CubeIcon, DocumentIcon, PaperClipIcon, ViewListIcon } from '@heroicons/vue/outline'
import { mapActions } from 'vuex'

import { mapGetters } from 'vuex/dist/vuex.cjs.js'

import { pluralize } from '../../../composables/String.js'

export default {
    name: 'ContextSelector',
    components: {
        PaperClipIcon
    },
    data () {
        return {
            selectedContextItems: []
        }
    },
    computed: {
        ...mapGetters('product/assistant', ['availableContextOptions', 'getSelectedContext']),
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
                    } else if (option.menuIcon === 'ViewListIcon') {
                        icon = ViewListIcon
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
        ...mapActions('product/assistant', ['setSelectedContext']),
        selectItem (option) {
            if (option.onSelectAction) {
                this.$store.dispatch(`product/assistant/${option.onSelectAction}`)
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
            border: 1px solid #c7d2fe; // indigo-300 to match other buttons
            border-radius: 5px;
            padding: 0.25rem 0.50rem;
            background: $ff-white;
            color: #1f2937; // gray-800, explicit dark text
            font-size: 0.875rem;

            .icon {
                svg {
                    color: inherit;
                    width: 1.25rem;
                    height: 1.25rem;
                }
            }

            &:hover:not(:disabled) {
                background-color: #f9fafb; // gray-50
            }

            &:focus:not(:disabled) {
                outline: none;
                background-color: #e0e7ff; // indigo-100
                color: #4338ca; // indigo-700
            }

            &:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        }

        &[data-headlessui-state="open"] {
            button.ff-button,
            button.ff-button:hover {
                background: $ff-indigo-600;
                border-color: $ff-indigo-600;
                color: $ff-white;

                .icon {
                    svg {
                        color: $ff-white;
                    }
                }
            }
        }
    }
}

.context-selector.active .relative button {
    background-color: #e0e7ff; // indigo-100
}
</style>
