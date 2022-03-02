<template>
    <input :type="password ? 'password' : 'text'"
        class="ff-input ff-text-input"
        :placeholder="placeholder"
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
    },
    emits: ['update:modelValue', 'input', 'blur', 'keyup']
}
</script>
