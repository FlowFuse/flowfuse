<template>
    <div class="ff-input ff-text-input" :class="{'ff-input--error': error}">
        <slot name="icon" />
        <input
            ref="input"
            :type="type"
            :placeholder="placeholder"
            :disabled="disabled"
            :value="modelValue"
            :maxlength="maxlength"
            :autocomplete="autocomplete"
            @change="$emit('update:modelValue', $event.target.value)"
            @input="$emit('update:modelValue', $event.target.value)"
            @blur="$emit('blur')" @keyup.enter="$emit('enter', $evt)"
        />
    </div>
</template>

<script>
export default {
    name: 'ff-text-input',
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
            default: null
        },
        maxlength: {
            type: String,
            default: null
        },
        autocomplete: {
            type: String,
            default: null
        },
        // flowfuse specific props
        size: {
            default: 'normal',
            type: String // "small", "normal"
        },
        type: {
            default: 'text', // One of: 'text', 'email', 'password' or 'number'
            type: String
        },
        // v-model
        modelValue: {
            type: [Number, String],
            default: ''
        }
    },
    emits: ['update:modelValue', 'input', 'blur', 'keyup', 'enter'],
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
