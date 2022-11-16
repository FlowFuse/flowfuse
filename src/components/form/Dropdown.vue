<template>
    <div class="ff-dropdown" :class="'ff-dropdown--' + (isOpen ? 'open' : 'closed')" :disabled="disabled">
        <div v-if="dropdownStyle === 'select'" @click="open()" class="ff-dropdown-selected">
            <slot name="placeholder">
                {{ selected?.label || placeholder }}
            </slot>
            <ChevronDownIcon class="ff-icon ff-btn--icon-right" />
        </div>
        <ff-button v-else-if="dropdownStyle === 'button'" @click="open()">
            {{ placeholder }}
            <template #icon-right><ChevronDownIcon /></template>
        </ff-button>
        <div v-show="isOpen">
            <div class="ff-dropdown-options" ref="options" v-click-outside="close" :class="{'ff-dropdown-options--full-width': dropdownStyle === 'select', 'ff-dropdown-options--fit': dropdownStyle === 'button', 'ff-dropdown-options--align-left': optionsAlign === 'left', 'ff-dropdown-options--align-right': optionsAlign === 'right'}">
                <slot></slot>
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
            type: [Number, String, Boolean]
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
    watch: {
        modelValue: function () {
            // handle async setting of modelvalue where value is set after options have loaded
            this.checkOptions()
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
    methods: {
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
                }
            }
        }
    }
}
</script>
