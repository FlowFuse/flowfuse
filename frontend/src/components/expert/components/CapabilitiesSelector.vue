<template>
    <div class="capabilities-selector">
        <ff-listbox v-model="capabilitiesHandler" :options="capabilities" return-model multiple :options-offset-top="5" label-key="name" value-key="mcpServerName">
            <template #options="{options}">
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
                            :class="{ active }" data-click-exclude="right-drawer"
                        >
                            <div>
                                <ff-checkbox :modelValue="selected" />
                            </div>
                            <div class="flex flex-col gap-1 flex-1">
                                <p class="truncate self-start flex justify-between w-full" style="line-height: 16px;">
                                    <span class="truncate">{{ option.mcpServerName }}</span>
                                    <span class="text-gray-400 text-sm">{{ option.toolCount }}</span>
                                </p>
                                <p v-if="option.title" class="text-gray-400 text-sm">{{ option.title }}</p>
                            </div>
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
        ...mapState(`product/expert/${OPERATOR_AGENT}`, ['selectedCapabilities']),
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
        ...mapActions(`product/expert/${OPERATOR_AGENT}`, ['setSelectedCapabilities'])
    }
}
</script>

<style lang="scss">
.capabilities-selector {
    position: absolute;
    left: 50%;
    top: 15px;
    transform: translateX(-50%);
    background: $ff-white;
    border: 1px solid $ff-indigo-700;
    border-radius: $ff-unit-sm;

    .ff-listbox {
        min-width: 300px;

        button {
            padding: 5px 10px;
            border: none;
            color: $ff-indigo-700;
            font-weight: bold;

            .icon {
                svg {
                    color: $ff-indigo-700;
                }
            }

            &:focus, &.active {
                outline: none;
            }
        }

        &[data-headlessui-state="open"] {
            button {
                background: $ff-indigo-800;
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
</style>
