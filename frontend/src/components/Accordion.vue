<template>
    <div class="ff-accordion">
        <button class="ff-accordion--button" @click="toggle()">
            <label>{{ label }}</label>
            <div>
                <slot name="meta"></slot>
                <ChevronDownIcon class="ff-icon" />
            </div>
        </button>
        <div ref="content" class="ff-accordion--content">
            <slot name="content"></slot>
        </div>
    </div>
</template>

<script>
import { ChevronDownIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-accordion',
    props: {
        label: {
            type: String,
            required: true
        }
    },
    data () {
        return {
            isOpen: false
        }
    },
    methods: {
        toggle: function () {
            if (this.isOpen) {
                this.close()
            } else {
                this.open()
            }
        },
        // externally facing open function so we can call all accordians open/close at once
        open: function () {
            const content = this.$refs.content
            content.style.maxHeight = content.scrollHeight + 'px'
            this.isOpen = true
        },
        close: function () {
            const content = this.$refs.content
            content.style.maxHeight = null
            this.isOpen = false
        }
    },
    components: {
        ChevronDownIcon
    }
}
</script>
