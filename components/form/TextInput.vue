<template>
    <input :type="password ? 'password' : 'text'"
        class="ff-input ff-text-input"
        :class="{'ff-input--error': error}"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="modelValue"
        @change="$emit('update:modelValue', $event.target.value)"
        @input="$emit('update:modelValue', $event.target.value)"
        @enter="$emit('enter', $event)"
        @blur="$emit('blur')" @keyup.enter="$emit('enter', $evt)"/>
</template>

<script>
export default {
    name: 'ff-text-input',
    emits: ['update:modelValue', 'input', 'blur', 'keyup'],
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
        password: {
            default: false,
            type: Boolean
        },
        // v-model
        modelValue: {
            type: String,
            default: '',
            required: true
        }
    }
}
</script>
