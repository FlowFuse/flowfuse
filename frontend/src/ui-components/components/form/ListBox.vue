<template>
    <Listbox v-slot="{ open }"
             v-model="value"
             :disabled="disabled"
             class="ff-listbox"
             data-el="listbox"
             :by="compareOptions"
             :multiple="multiple"
    >
        <span v-if="syncOpenState(open)" class="hidden" />

        <div class="relative">
            <ListboxButton
                ref="trigger"
                class="w-full rounded-md flex justify-between ff-button"
                :class="[disabled ? 'cursor-not-allowed bg-gray-200 text-gray-500' : '']"
                @click="() => { $nextTick(() => { updateItemsPosition() }) }"
            >
                <input type="text" hidden="hidden" :value="selectedLabel">
                <slot name="button">
                    <span class="block truncate">{{ selectedLabel }}</span>
                </slot>
                <span class="icon pointer-events-none inset-y-0 flex items-center pl-2">
                    <ChevronDownIcon :class="['h-5 w-5', disabled ? 'text-gray-500' : 'text-black']" aria-hidden="true" />
                </span>
            </ListboxButton>

            <transition
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <teleport to="body">
                    <ListboxOptions
                        v-if="open"
                        data-el="listbox-options"
                        class="absolute w-full overflow-auto bg-white py-1 ff-options"
                        :style="{
                            top: position.top + 'px',
                            left: position.left + 'px',
                            width: position.width + 'px',
                            transform: position.transform || ''
                        }"
                    >
                        <slot name="options" :options="options">
                            <ListboxOption
                                v-for="option in options"
                                v-slot="{ active, selected }"
                                :key="option[labelKey]"
                                :value="option"
                                as="template"
                                class="ff-option"
                                :data-option="option[labelKey]"
                                :title="optionTitleKey ? option[optionTitleKey] : null"
                                @click="close"
                            >
                                <li>
                                    <div class="ff-option-content" :class="{selected, active}" data-click-exclude="right-drawer">
                                        {{ option[labelKey] }}
                                    </div>
                                </li>
                            </ListboxOption>
                        </slot>
                    </ListboxOptions>
                </teleport>
            </transition>
        </div>
    </Listbox>
</template>

<script>
import {
    Menu as HeadlessUIMenu,
    Listbox,
    ListboxButton,
    ListboxOption, ListboxOptions
} from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/solid'

import BoxOptionsMixin from '../../../mixins/BoxOptionsMixin.js'

export default {
    name: 'ff-listbox',
    components: {
        HeadlessUIMenu,
        ChevronDownIcon,
        Listbox,
        ListboxButton,
        ListboxOption,
        ListboxOptions
    },
    mixins: [BoxOptionsMixin],
    props: {
        modelValue: {
            required: false,
            default: null,
            type: [Boolean, Number, Object, String, null]
        },
        options: {
            required: false,
            type: Array,
            default: () => []
        },
        disabled: {
            required: false,
            default: false,
            type: Boolean
        },
        placeholder: {
            required: false,
            default: 'Please Select',
            type: String
        },
        labelKey: {
            required: false,
            default: 'label',
            type: String
        },
        valueKey: {
            required: false,
            default: 'value',
            type: [String, Array]
        },
        optionTitleKey: {
            required: false,
            default: null,
            type: [null, String]
        },
        returnModel: {
            required: false,
            default: false,
            type: Boolean
        },
        multiple: {
            required: false,
            default: false,
            type: Boolean
        }
    },
    emits: ['update:modelValue'],
    computed: {
        value: {
            get () {
                return this.modelValue
            },
            set (value) {
                if (this.multiple) {
                    const arr = Array.isArray(value) ? value : (value == null ? [] : [value])
                    this.$emit(
                        'update:modelValue',
                        this.returnModel
                            ? arr
                            : arr
                                .map(v => this.extractModelValueFromOption(v))
                                .filter(v => v !== undefined)
                    )
                    return
                }
                this.$emit('update:modelValue', this.returnModel ? value : this.extractModelValueFromOption(value))
            }
        },
        selectedOption () {
            if (this.value === undefined || this.value === null || this.multiple) {
                return null
            }

            return this.options.find(opt => {
                const modelComparable = this.returnModel ? this.extractModelValueFromOption(this.value) : this.value
                return this.compareByValueKey(opt, modelComparable)
            })
        },
        selectedLabel () {
            if (this.multiple) {
                const values = Array.isArray(this.modelValue) ? this.modelValue : []
                if (!values.length) {
                    return this.placeholder
                }
                return `${values.length} selected`
            }

            return this.selectedOption ? this.selectedOption[this.labelKey] : this.placeholder
        }
    },
    methods: {
        extractModelValueFromOption (option) {
            if (!option) return undefined

            if (Array.isArray(this.valueKey)) {
                // For composite keys, emit an object containing just the key parts
                const out = {}
                for (const k of this.valueKey) {
                    out[k] = option?.[k]
                }
                return out
            }

            return option?.[this.valueKey]
        },
        compareByValueKey (optionLike, modelComparable) {
            if (!optionLike) return false

            if (Array.isArray(this.valueKey)) {
                if (!modelComparable || typeof modelComparable !== 'object') return false
                return this.valueKey.every(k => optionLike?.[k] === modelComparable?.[k])
            }

            return optionLike?.[this.valueKey] === modelComparable
        },
        compareOptions (modelValue, optionValue) {
            if (!this.returnModel) {
                // modelValue is what v-model stores (primitive or composite object)
                return this.compareByValueKey(optionValue, modelValue)
            }

            // returnModel=true => modelValue/optionValue are full option objects
            return this.compareByValueKey(optionValue, this.extractModelValueFromOption(modelValue))
        }
    }
}
</script>

<style lang="scss">
.ff-listbox {
  display: inline-block;
  min-width: 200px;

  &:focus-visible {
    border: none;
    outline: none;

  }

  .ff-button {
    border: 1px solid $ff-grey-300;
    padding: 5px 5px 5px 10px;
    background: $ff-white;

    &:focus-visible {
        outline: none;
    }

    &:focus {
        border-color: $ff-blue-500;
    }

    .icon {
      svg {
        width: 1.5rem;
        height: 1.5rem;
      }
    }
  }

  &[data-headlessui-state="open"] {
    button {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
  }
}

.ff-options {
    background: $ff-grey-50;
    box-shadow: 0 6px 9px 0 #00000038;
    max-height: 28rem;
    z-index: 200;
    overflow-y: auto;
    padding: 0;
    border-left: 1px solid $ff-grey-200;
    border-right: 1px solid $ff-grey-200;
    border-bottom: 1px solid $ff-grey-200;
    &:focus-visible, &:focus {
        outline: none;
    }

    .ff-option {
        border-bottom: 1px solid $ff-grey-200;
        background-color: $ff-grey-50;
        cursor: pointer;

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
                border-color: transparent
            }
        }
    }
}
</style>
