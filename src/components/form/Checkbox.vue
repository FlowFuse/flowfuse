<template>
    <label class="ff-checkbox" :disabled="disabled">
        <input type="checkbox" :value="modelValue" :disabled="disabled" v-model="model" />
        <span class="checkbox" :checked="model"></span>
        <label @click="toggle" v-if="label !== null || $slots.default">
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
        toggle () {
            if (!this.disabled) {
                this.model = !this.model
            }
        }
    }

}
</script>
