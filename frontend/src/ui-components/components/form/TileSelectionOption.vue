<template>
    <div ref="input" class="ff-tile-selection-option"
         :class="{'editable': editable, 'disabled': disabled, 'active': selected}"
         :style="{'--ff-tile-selection-color': color || null}"
         tabindex="0" @click="select(false)" @keydown.space.prevent="select(true)"
    >
        <div class="ff-tile-selection-option--header">
            <h2>
                <PencilAltIcon v-if="editable" class="ff-tile-selection-option--edit" @click="select(true)" />
                <slot v-else name="icon"><CheckCircleIcon /></slot>
                {{ label }}
            </h2>
            <div class="ff-tile-selection-option--price">
                <h2>{{ price }}</h2>
                <label>{{ priceInterval }}</label>
            </div>
        </div>
        <div v-if="description" class="ff-tile-selection-option--description">
            <ff-markdown-viewer :content="description" />
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

// icons
import { CheckCircleIcon, PencilAltIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-tile-selection-option',
    components: {
        CheckCircleIcon,
        PencilAltIcon
    },
    props: {
        value: {
            required: true,
            type: [String, Number]
        },
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
        color: {
            default: null,
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
    emits: ['edit'],
    data () {
        return {
            selected: false
        }
    },
    mounted () {
        this.$parent.registerOption(this)
    },
    methods: {
        select (allowEdit = false) {
            if (this.disabled) {
                return
            }

            if (!this.editable) {
                this.$parent.setSelected({
                    value: this.value,
                    label: this.label,
                    description: this.description,
                    price: this.price
                })
                this.selected = !this.selected
            } else if (allowEdit) {
                this.$emit('edit')
            }
        },
        focus () {
            this.$refs.input?.focus()
        },
        blur () {
            this.$refs.input?.blur()
        }
    }
}
</script>
