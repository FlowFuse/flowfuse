<template>
    <input class="ff-input ff-text-input"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="modelValue"
        @change="$emit('update:modelValue', $event.target.value)"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur')" @keyup.enter="$emit('keyup')"/>
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
            type: String,
            required: true
        },
        // v-model
        modelValue: {
            type: String,
            default: '',
            required: true
        }
    },
    emits: ['update:modelValue', 'input', 'blur', 'keyup']
}
</script>
