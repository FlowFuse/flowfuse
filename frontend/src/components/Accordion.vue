<template>
    <div class="ff-accordion" data-el="accordion">
        <button class="ff-accordion--button" :disabled="disabled" @click="toggle()">
            <slot name="label">
                <label>{{ label }}</label>
            </slot>
            <div class="toggle">
                <slot name="meta" />
                <ChevronLeftIcon v-if="!disabled" class="ff-icon chevron" />
            </div>
        </button>
        <div v-if="isOpen" ref="content" class="ff-accordion--content">
            <slot name="content" />
        </div>
    </div>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-accordion',
    components: {
        ChevronLeftIcon
    },
    props: {
        label: {
            type: String,
            required: false,
            default: ''
        },
        setOpen: {
            type: Boolean,
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    emits: ['state-changed'],
    data () {
        return {
            isOpen: false
        }
    },
    watch: {
        isOpen: function (value) {
            if (value) {
                this.$nextTick(() => {
                    // wait until content has been added to DOM
                    const content = this.$refs.content
                    return (2 * content.scrollHeight) + 'px'
                })
                this.$emit('state-changed', value)
            } else {
                return null
            }
        }
    },
    mounted () {
        // accordion is open by default on page load
        if (this.setOpen) {
            this.isOpen = true
        }
    },
    methods: {
        toggle: function () {
            if (!this.disabled) {
                if (this.isOpen) {
                    this.close()
                } else {
                    this.open()
                }
            }
        },
        // externally facing open function so we can call all accordions open/close at once
        open: function () {
            this.isOpen = true
        },
        close: function () {
            this.isOpen = false
        }
    }
}
</script>
