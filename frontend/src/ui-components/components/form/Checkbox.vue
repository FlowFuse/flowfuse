<template>
    <label class="ff-checkbox" :disabled="disabled">
        <input v-model="model" type="checkbox" :value="modelValue" :disabled="disabled" />
        <span ref="input" class="checkbox" :checked="model" tabindex="0" @keydown.space.prevent="toggle"></span>
        <label v-if="label !== null || $slots.default" @click="toggle">
            <slot>{{ label }}</slot>
        </label>
    </label>
</template>

<script>
export default {
    name: 'ff-checkbox',
    props: {
        label: {
            default: null,
            type: String
        },
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
