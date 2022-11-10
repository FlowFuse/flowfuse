<template>
    <label class="ff-checkbox" :disabled="disabled">
        <input type="checkbox" :value="modelValue" :disabled="disabled" v-model="model" />
        <span class="checkbox" :checked="model"></span>
        <label @click="toggle">
            <slot>{{ label }}</slot>
        </label>
    </label>
</template>

<script>
export default {
    name: 'ff-checkbox',
    props: {
        label: {
            required: true,
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
