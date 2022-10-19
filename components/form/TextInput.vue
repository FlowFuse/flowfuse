<template>
    <div class="ff-input ff-text-input" :class="{'ff-input--error': error}">
        <slot name="icon"></slot>
        <input
            :type="type"
            :placeholder="placeholder"
            :disabled="disabled"
            :value="modelValue"
            ref="input"
            @change="$emit('update:modelValue', $event.target.value)"
            @input="$emit('update:modelValue', $event.target.value)"
            @blur="$emit('blur')" @keyup.enter="$emit('enter', $evt)"
        />
    </div>
</template>

<script>
export default {
    name: 'ff-text-input',
    emits: ['update:modelValue', 'input', 'blur', 'keyup', 'enter'],
    props: {
        // broker standard text-input props
        disabled: {
            type: Boolean,
            default: false
        },
        error: {
            type: String,
            default: ''
        },
        placeholder: {
            type: String,
            default: ''
        },
        // flowforge specific props
        size: {
            default: 'normal',
            type: String // "small", "normal"
        },
        type: {
            default: 'text', // One of: 'text', 'email', or 'password'
            type: String
        },
        // v-model
        modelValue: {
            type: String,
            default: ''
        }
    },
    methods: {
        focus () {
            this.$refs.input?.focus()
        },
        blur () {
            this.$refs.input?.blur()
        }
    }
}
</script>
