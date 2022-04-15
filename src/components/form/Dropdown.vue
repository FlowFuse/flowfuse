<template>
    <div class="ff-dropdown" :class="'ff-dropdown--' + (isOpen ? 'open' : 'closed')">
        <div class="ff-dropdown-selected" @click="open()">
            {{ selected?.label || placeholder }}
        <ChevronDownIcon class="ff-icon"/></div>
        <div class="ff-dropdown-options">
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
        options: {
            default: null,
            type: Array
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
                console.log(selected)
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
