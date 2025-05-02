<template>
    <Combobox v-model="value" class="ff-combobox" data-el="combobox" :by="compareOptions" :disabled="disabled" nullable>
        <div class="relative">
            <ComboboxInput
                ref="trigger"
                class="w-full bg-white ff-combobox-input"
                :class="[disabled ? 'cursor-not-allowed bg-gray-200 text-gray-500' : '']"
                :display-value="displayValue"
                :placeholder="placeholder"
                @input="query = $event.target.value"
                @focus="() => { $nextTick(() => { updatePosition(); open = true }) }"
            />

            <ComboboxButton v-if="!disabled" class="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronDownIcon class="h-5 w-5 text-gray-700 ff-icon" aria-hidden="true" />
            </ComboboxButton>

            <transition
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <teleport to="body">
                    <ComboboxOptions
                        v-if="open && filteredOptions.length"
                        class="absolute ff-options"
                        data-el="options"
                        :style="{
                            top: position.top + 'px',
                            left: position.left + 'px',
                            width: position.width + 'px'
                        }"
                    >
                        <ComboboxOption
                            v-for="option in filteredOptions"
                            v-slot="{ active, selected }"
                            :key="option[valueKey]"
                            :value="option"
                            class="ff-option"
                        >
                            <li>
                                <div class="ff-option-content" :class="{ selected, active }">
                                    {{ option[labelKey] }}
                                </div>
                            </li>
                        </ComboboxOption>
                    </ComboboxOptions>
                </teleport>
            </transition>
        </div>
    </Combobox>
</template>

<script>
import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions
} from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/solid'

import BoxOptionsMixin from '../../../mixins/BoxOptionsMixin.js'

export default {
    name: 'ff-combobox',
    components: {
        Combobox,
        ComboboxInput,
        ComboboxButton,
        ComboboxOptions,
        ComboboxOption,
        ChevronDownIcon
    },
    mixins: [BoxOptionsMixin],
    props: {
        modelValue: {
            required: false,
            default: null,
            type: [Boolean, Number, Object, String, null]
        },
        options: {
            type: Array,
            default: () => []
        },
        disabled: {
            type: Boolean,
            default: false
        },
        placeholder: {
            type: String,
            default: 'Please Select'
        },
        labelKey: {
            type: String,
            default: 'label'
        },
        valueKey: {
            type: String,
            default: 'value'
        },
        returnModel: {
            type: Boolean,
            default: false
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
            query: ''
        }
    },
    computed: {
        value: {
            get () {
                return this.options.find(opt => {
                    if (Object.prototype.hasOwnProperty.call(opt, this.valueKey)) {
                        return opt[this.valueKey] === this.modelValue
                    }

                    return opt === this.modelValue
                })
            },
            set (val) {
                let payload = val?.[this.valueKey] ?? val

                if (this.returnModel) {
                    payload = { ...val }
                    delete payload.unavailable
                }

                this.$emit('update:modelValue', payload ?? null)
            }
        },
        displayValue () {
            return (option) => option?.[this.labelKey] ?? option
        },
        filteredOptions () {
            // Convert primitive or mixed options into a consistent object format
            const normalize = opt => ({
                [this.labelKey]: opt?.[this.labelKey] ?? opt,
                [this.valueKey]: opt?.[this.valueKey] ?? opt,
                unavailable: opt.unavailable || opt.disabled || false
            })

            const query = this.query?.toLowerCase()

            return this.options
                .filter(opt => {
                    if (!query) return true

                    const label = opt?.[this.labelKey]?.toString().toLowerCase() ?? opt.toString().toLowerCase()
                    return label.includes(query)
                })
                .map(normalize)
        }
    },
    methods: {
        compareOptions (modelValue, optionValue) {
            if (!modelValue) return

            modelValue = modelValue?.[this.valueKey] ?? modelValue
            optionValue = optionValue?.[this.valueKey] ?? optionValue

            return modelValue === optionValue
        }
    }
}
</script>

<style lang="scss">
.ff-combobox {
    min-width: 200px;

    &[data-headlessui-state="open"] {
        input {
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
        }
    }

    .ff-combobox-input {
        padding: 5px 2.5rem 5px 10px;
        border: 1px solid $ff-grey-300;
        font-size: $ff-funit-md;
        line-height: 1.5;
        &:focus {
            border-color: $ff-grey-300;
            outline: none;
        }
    }

    .ff-options {
        background: $ff-grey-50;
        box-shadow: 0 6px 9px 0 #00000038;
        max-height: 14rem;
        z-index: 100;
        overflow-y: auto;
        padding: 0;
        border-left: 1px solid $ff-grey-200;
        border-right: 1px solid $ff-grey-200;
        border-bottom: 1px solid $ff-grey-200;
    }

    .ff-option {
        cursor: pointer;
        border-bottom: 1px solid $ff-grey-200;

        &:last-of-type {
            border-bottom: none;
        }

        .ff-option-content {
            padding: $ff-unit-sm $ff-unit-md;
            border: 1px solid transparent;

            &.selected {
                background-color: $ff-grey-200;
            }

            &.active {
                border: 1px solid $ff-indigo-300;
            }

            &.selected.active {
                border-color: transparent;
            }
        }

        &:hover {
            background-color: $ff-grey-200;
            .ff-option-content.active {
                border-color: transparent;
            }
        }
    }
}
</style>
