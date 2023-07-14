<template>
    <label class="ff-toggle-switch" :disabled="disabled">
        <input v-model="model" type="checkbox" :value="modelValue" :disabled="disabled" @click="toggle" />
        <div class="ff-toggle-switch-slider">
            <div class="ff-toggle-switch-button">
                <slot></slot>
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
        modelValue: {
            required: true,
            type: Boolean
        }
    },
    emits: ['update:modelValue'],
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
                this.model = !this.model
            }
        }
    }

}
</script>
