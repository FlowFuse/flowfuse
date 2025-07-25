<template>
    <div class="ff-dropdown" :class="'ff-dropdown--' + (isOpen ? 'open' : 'closed')" :disabled="disabled">
        <div v-if="dropdownStyle === 'select'" ref="dropdownLabel" class="ff-dropdown-selected" tabindex="0" @click="open()" @keydown.space.prevent="open()">
            <slot name="placeholder">
                <div class="ff-dropdown-selected-item">
                    {{ selected?.label || placeholder }}
                </div>
            </slot>
            <ChevronDownIcon v-if="showChevron" class="ff-icon ff-btn--icon-right ff-dropdown-icon" />
        </div>
        <ff-button v-else-if="dropdownStyle === 'button'" @click="open()">
            {{ placeholder }}
            <template #icon-right><ChevronDownIcon v-if="showChevron" /></template>
        </ff-button>
        <div v-show="isOpen">
            <div ref="options" v-click-outside="close" class="ff-dropdown-options" :class="{'ff-dropdown-options--full-width': dropdownStyle === 'select', 'ff-dropdown-options--fit': dropdownStyle === 'button', 'ff-dropdown-options--align-left': optionsAlign === 'left', 'ff-dropdown-options--align-right': optionsAlign === 'right'}">
                <slot />
            </div>
        </div>
    </div>
</template>

<script>
import { ChevronDownIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-dropdown',
    components: {
        ChevronDownIcon
    },
    props: {
        modelValue: {
            default: null,
            type: [Number, String, Boolean, Object, Array]
        },
        placeholder: {
            default: 'Please Select',
            type: String
        },
        dropdownStyle: {
            default: 'select', // 'button' or 'select'
            type: String
        },
        optionsAlign: {
            default: 'left',
            type: String
        },
        disabled: {
            default: false,
            type: Boolean
        },
        showChevron: {
            default: true,
            type: Boolean
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
            isOpen: false,
            selected: null,
            options: []
        }
    },
    computed: {
        value: {
            get () {
                return this.selected
            },
            set (selected) {
                this.selected = selected
                this.$emit('update:modelValue', selected.value)
                this.isOpen = false
            }
        }
    },
    watch: {
        modelValue: function () {
            // handle async setting of modelvalue where value is set after options have loaded
            this.checkOptions()
        }
    },
    methods: {
        focus () {
            this.$refs.dropdownLabel?.focus()
        },
        blur () {
            this.$refs.dropdownLabel?.blur()
        },
        open: function () {
            if (!this.disabled) {
                this.isOpen = !this.isOpen
            }
        },
        close: function () {
            this.isOpen = false
        },
        registerOption (option) {
            this.options.push(option)
            if (this.modelValue === option.value) {
                this.selected = option
            }
        },
        checkOptions () {
            for (let i = 0; i < this.options.length; i++) {
                if (this.options[i].value === this.modelValue) {
                    this.selected = this.options[i]
                    return
                }
            }

            this.selected = null
        }
    }
}
</script>
