<template>
    <div class="ff-accordion" :class="{'open': isOpen}">
        <button class="ff-accordion--button" :disabled="disabled" @click="toggle()">
            <label>{{ label }}</label>
            <div>
                <slot name="meta"></slot>
                <ChevronLeftIcon v-if="!disabled" class="ff-icon" />
            </div>
        </button>
        <div ref="content" class="ff-accordion--content" :style="{'max-height': contentHeight}">
            <slot name="content"></slot>
        </div>
    </div>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-accordion',
    props: {
        label: {
            type: String,
            required: true
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
    data () {
        return {
            isOpen: false
        }
    },
    computed: {
        contentHeight: function () {
            if (this.isOpen) {
                const content = this.$refs.content
                return content.scrollHeight + 'px'
            } else {
                return null
            }
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
        // externally facing open function so we can call all accordians open/close at once
        open: function () {
            this.isOpen = true
        },
        close: function () {
            this.isOpen = false
        }
    },
    mounted () {
        // accordion is open by default on page load
        if (this.setOpen) {
            this.isOpen = true
        }
    },
    components: {
        ChevronLeftIcon
    }
}
</script>
