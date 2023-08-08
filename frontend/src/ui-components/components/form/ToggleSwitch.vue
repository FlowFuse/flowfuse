<template>
    <label class="ff-toggle-switch" :disabled="disabled" :class="{'checked': model}">
        <!-- <input v-model="model" type="checkbox" :value="modelValue" /> -->
        <div class="ff-toggle-switch-slider" @click="toggle">
            <div class="ff-toggle-switch-button">
                <slot v-if="!loading"></slot>
                <ff-spinner v-else />
            </div>
        </div>
    </label>
</template>

<script>
export default {
    name: 'ff-toggle-switch',
    props: {
        disabled: {
            default: false,
            type: Boolean
        },
        mode: {
            default: 'sync',
            type: String
        },
        loading: {
            default: false,
            type: Boolean
        },
        modelValue: {
            required: true,
            type: Boolean
        }
    },
    emits: ['update:modelValue', 'click'],
    computed: {
        model: {
            get () {
                return this.modelValue
            },
            set (value) {
                this.$emit('update:modelValue', value)
            }
        }
    },
    methods: {
        focus () {
            this.$refs.input?.focus()
        },
        blur () {
            this.$refs.input?.blur()
        },
        toggle () {
            if (!this.disabled) {
                if (this.mode === 'sync') {
                    this.model = !this.model
                } else if (this.mode === 'async') {
                    this.$emit('click')
                } else {
                    throw new Error('Invalid mode')
                }
            }
        }
    }

}
</script>
