<template>
    <Listbox v-model="value" :disabled="disabled" class="ff-listbox">
        <div class="relative">
            <ListboxButton
                class="w-full rounded-md bg-white flex justify-between button"
                :class="[disabled ? 'cursor-not-allowed bg-gray-200 text-gray-500' : '']"
            >
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
                <ListboxOptions class="absolute w-full overflow-auto bg-white py-1 options">
                    <slot name="options">
                        <ListboxOption
                            v-for="option in options"
                            v-slot="{ active, selected }"
                            :key="labelKey === 'label' ? option.label : option[labelKey]"
                            :value="option"
                            as="template"
                            class="option"
                            :title="optionTitleKey ? option[optionTitleKey] : null"
                        >
                            <li>
                                <div class="option-content" :class="{selected, active}">
                                    {{ labelKey === 'label' ? option.label : option[labelKey] }}
                                </div>
                            </li>
                        </ListboxOption>
                    </slot>
                </ListboxOptions>
            </transition>
        </div>
    </Listbox>
</template>

<script>
import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions
} from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-listbox',
    components: {
        ChevronDownIcon,
        Listbox,
        ListboxButton,
        ListboxOption,
        ListboxOptions
    },
    props: {
        modelValue: {
            required: false,
            default: null,
            type: [Number, Object, String, null]
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
            type: String
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
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
        }
    },
    computed: {
        value: {
            get () {
                return this.modelValue
            },
            set (value) {
                this.$emit('update:modelValue', !this.returnModel ? value[this.valueKey] : value)
            }
        },
        selectedOption () {
            if (!this.value) {
                return null
            }

            return this.options.find(opt => {
                return opt[this.valueKey] === (!this.returnModel ? this.value : this.value[this.valueKey])
            })
        },
        selectedLabel () {
            return this.selectedOption ? this.selectedOption[this.labelKey] : this.placeholder
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

  .button {
    border: 1px solid $ff-grey-300;
    padding: 5px 5px 5px 10px;
    &:focus-visible, &:focus {
      outline: none;
    }

    .icon {
      svg {
        width: 1.5rem;
        height: 1.5rem;
      }
    }
  }

  .options {
    background: $ff-grey-50;
    box-shadow: 0 6px 9px 0 #00000038;
    max-height: 14rem;
    z-index: 100;
    overflow-y: auto;
    padding: 0;
    border-left: 1px solid $ff-grey-200;
    border-right: 1px solid $ff-grey-200;
    border-bottom: 1px solid $ff-grey-200;
    &:focus-visible, &:focus {
      outline: none;
    }

    .option {
      border-bottom: 1px solid $ff-grey-200;
      background-color: $ff-grey-50;
      cursor: pointer;

      &:last-of-type {
        border-bottom: none;
      }

      .option-content {
        padding: $ff-unit-sm $ff-unit-md;

        &.selected, &.active {
          background-color: $ff-grey-200;
        }
      }

      &:hover {
        background-color: $ff-grey-200;
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
</style>
