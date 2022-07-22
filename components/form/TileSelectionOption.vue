<template>
    <div class="ff-tile-selection-option" :class="{'editable': editable, 'disabled': disabled, 'active': selected}" @click="select()">
        <div class="ff-tile-selection-option--header">
            <h2>
                <PencilAltIcon class="ff-tile-selection-option--edit" v-if="editable" @click="$emit('edit')"/>
                <CheckCircleIcon v-else />
                {{ label }}
            </h2>
            <div class="ff-tile-selection-option--price">
                <h2>{{ price }}</h2>
                <label>{{ priceInterval }}</label>
            </div>
        </div>
        <div>
            <ff-markdown-viewer :content="description"></ff-markdown-viewer>
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

// icons
import { CheckCircleIcon, PencilAltIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-tile-selection-option',
    emits: ['edit'],
    props: {
        value: null,
        editable: {
            default: false,
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
        PencilAltIcon
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
            if (!this.editable) {
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
