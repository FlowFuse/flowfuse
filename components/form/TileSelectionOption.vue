<template>
    <div class="ff-tile-selection-option" :class="{'selectable': selectable, 'disabled': disabled, 'active': selected}" @click="select()">
        <div class="ff-tile-selection-option--header">
            <h2>
                <CheckCircleIcon v-if="selectable" />
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
        <div v-if="meta" class="ff-tile-selection-option--meta">
            <div v-for="(row, $index) in meta" :key="$index">
                <span>{{ row.key }}</span>
                <span>{{ row.value }}</span>
            </div>
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
        selectable: {
            default: true,
            type: Boolean
        },
        disabled: {
            default: false,
            type: Boolean
        },
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
        },
        meta: {
            default: null,
            type: Array
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
            if (this.selectable) {
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
}
</script>
