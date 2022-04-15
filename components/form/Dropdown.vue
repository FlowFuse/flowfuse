<template>
    <div class="ff-dropdown" :class="'ff-dropdown--' + (isOpen ? 'open' : 'closed')">
        <div v-if="dropdownStyle === 'select'" @click="open()">
            <div class="ff-dropdown-selected">
                {{ selected?.label || placeholder }}
                <ChevronDownIcon class="ff-icon"/>
            </div>
        </div>
        <ff-button v-else-if="dropdownStyle === 'button'" @click="open()">
            {{ placeholder }}
            <template v-slot:icon-right><ChevronDownIcon /></template>
        </ff-button>
        <div class="ff-dropdown-options" :class="{'ff-dropdown-options--full-width': dropdownStyle === 'select', 'ff-dropdown-options--fit': dropdownStyle === 'button', 'ff-dropdown-options--align-left': optionsAlign === 'left', 'ff-dropdown-options--align-right': optionsAlign === 'right'}">
            <slot></slot>
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
            default: null
        },
        placeholder: {
            default: 'Please Select'
        },
        dropdownStyle: {
            default: 'select'
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
        }
    }
}
</script>
