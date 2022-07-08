<template>
    <div class="ff-tile-selection-option" :class="{'active': selected}" @click="select()">
        <div class="ff-tile-selection-option--header">
            <h2>
                <CheckCircleIcon />
                {{ label }}
            </h2>
            <div class="ff-tile-selection-option--price">
                <h2>{{ price }}</h2>
                <label>{{ priceInterval }}</label>
            </div>
        </div>
        <div>
            <MarkdownViewer :content="description"></MarkdownViewer>
        </div>
    </div>
</template>

<script>

// components
import MarkdownViewer from '@/components/Markdown.vue'

// icons
import { CheckCircleIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-tile-selection-option',
    props: {
        value: null,
        label: {
            default: '',
            type: String
        },
        description: {
            default: '',
            type: String
        },
        price: {
            default: '',
            type: String
        },
        priceInterval: {
            default: '',
            type: String
        }
    },
    components: {
        CheckCircleIcon,
        MarkdownViewer
    },
    data () {
        return {
            selected: false
        }
    },
    mounted () {
        this.$parent.registerOption(this)
    },
    methods: {
        select () {
            this.$parent.value = {
                value: this.value,
                label: this.label,
                description: this.description,
                price: this.price
            }
            this.selected = !this.selected
        }
    }
}
</script>
