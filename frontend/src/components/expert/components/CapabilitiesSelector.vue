<template>
    <div class="capabilities-selector">
        <ff-listbox
            v-model="capabilitiesHandler"
            :options="capabilities"
            return-model
            multiple
            label-key="name"
            :value-key="['instance', 'mcpServerUrl']"
            placeholder="Resources"
            open-above
            :min-options-width="280"
            align-right
        >
            <template #options="{ options }">
                <ListboxOption
                    v-for="option in options"
                    v-slot="{ active, selected }"
                    :key="option.mcpServerName"
                    as="template"
                    :value="option"
                    class="ff-option ff-team-selection-option"
                    :data-option="option.mcpServerName"
                    :title="`Instance: '${option.instanceName}', MCP: '${option.mcpServerName}'`"
                >
                    <li>
                        <div
                            class="ff-option-content flex truncate justify-start !items-start !gap-2 !p-2"
                            :class="{ active }"
                            data-click-exclude="right-drawer"
                        >
                            <div>
                                <ff-checkbox :modelValue="selected" />
                            </div>
                            <div class="flex flex-col gap-1 flex-1 min-w-0">
                                <span
                                    class="truncate"
                                    style="line-height: 16px"
                                >{{ option.mcpServerName }}</span>
                                <p
                                    v-if="option.title"
                                    class="text-gray-400 text-sm truncate"
                                >
                                    {{ option.title }}
                                </p>
                            </div>
                            <span class="tool-count-badge self-start" title="Tools">{{
                                option.toolCount
                            }}</span>
                        </div>
                    </li>
                </ListboxOption>
            </template>
        </ff-listbox>
    </div>
</template>

<script>
import { ListboxOption } from '@headlessui/vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import { OPERATOR_AGENT } from '../../../store/modules/product/expert/agents.js'
import FfCheckbox from '../../../ui-components/components/form/Checkbox.vue'
import FfListbox from '../../../ui-components/components/form/ListBox.vue'

export default {
    name: 'CapabilitiesSelector',
    components: {
        FfCheckbox,
        ListboxOption,
        FfListbox
    },
    computed: {
        ...mapState(`product/expert/${OPERATOR_AGENT}`, [
            'selectedCapabilities'
        ]),
        ...mapGetters(`product/expert/${OPERATOR_AGENT}`, ['capabilities']),
        capabilitiesHandler: {
            get () {
                return this.selectedCapabilities
            },
            set (value) {
                this.setSelectedCapabilities(value)
            }
        }
    },
    methods: {
        ...mapActions(`product/expert/${OPERATOR_AGENT}`, [
            'setSelectedCapabilities'
        ])
    }
}
</script>

<style lang="scss">
.capabilities-selector {
    .ff-listbox {
        min-width: auto;

        .ff-options {
            max-width: 320px;
        }

        button.ff-button {
            padding: 0.5rem 0.75rem;
            border: 1px solid #c7d2fe; // indigo-300 to match other buttons
            border-radius: 9999px; // pill shape
            background: $ff-white;
            color: inherit;
            font-size: 0.875rem;

            .icon {
                svg {
                    color: inherit;
                    width: 1.25rem;
                    height: 1.25rem;
                }
            }

            &:hover {
                background-color: #f9fafb; // gray-50
            }

            &:focus,
            &.active {
                outline: none;
            }
        }

        &[data-headlessui-state="open"] {
            button.ff-button {
                background: $ff-indigo-600;
                border-color: $ff-indigo-600;
                color: $ff-white;
                border-radius: 9999px; // keep pill shape when open

                .icon {
                    svg {
                        color: $ff-white;
                    }
                }
            }
        }
    }
}

.tool-count-badge {
    background-color: #e0e7ff; // indigo-100
    color: #4338ca; // indigo-700
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    min-width: 1.5rem;
    text-align: center;
    flex-shrink: 0;
}
</style>
