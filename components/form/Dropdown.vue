<template>
    <div class="ff-dropdown" :class="'ff-dropdown--' + (isOpen ? 'open' : 'closed')">
        <div v-if="dropdownStyle === 'select'" @click="open()" class="ff-dropdown-selected">
            <slot name="placeholder">
                {{ selected?.label || placeholder }}
            </slot>
            <ChevronDownIcon class="ff-icon"/>
        </div>
        <ff-button v-else-if="dropdownStyle === 'button'" @click="open()">
            {{ placeholder }}
            <template v-slot:icon-right><ChevronDownIcon /></template>
        </ff-button>
        <template v-if="isOpen">
            <div class="ff-dropdown-options" v-click-outside="close" :class="{'ff-dropdown-options--full-width': dropdownStyle === 'select', 'ff-dropdown-options--fit': dropdownStyle === 'button', 'ff-dropdown-options--align-left': optionsAlign === 'left', 'ff-dropdown-options--align-right': optionsAlign === 'right'}">
                <slot></slot>
            </div>
        </template>
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
            default: null
        },
        placeholder: {
            default: 'Please Select'
        },
        dropdownStyle: {
            default: 'select' // 'button' or 'select'
        },
        optionsAlign: {
            default: 'left',
            type: String
        }
    },
    data () {
        return {
            isOpen: false,
            selected: null
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
            this.isOpen = !this.isOpen
        },
        close: function () {
            this.isOpen = false
        }
    }
}
</script>
