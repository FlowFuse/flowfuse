<template>
    <label class="ff-radio-btn" :disabled="disabled" @click="select(value)">
        <input type="radio" :value="value">
        <span ref="input" class="checkbox" :checked="checked" tabindex="0" @keydown.space.prevent="select(value)" />
        <label>{{ label }}</label>
        <p v-if="description && !hideDescription" class="ff-description">{{ description }}</p>
    </label>
</template>

<script>
export default {
    name: 'ff-radio-button',
    props: {
        label: {
            required: true,
            type: String
        },
        value: {
            required: true,
            type: [String, Number]
        },
        checked: {
            default: false,
            type: Boolean
        },
        description: {
            default: null,
            type: String
        },
        disabled: {
            default: false,
            type: Boolean
        },
        hideDescription: {
            default: false,
            type: Boolean
        }
    },
    emits: ['select'],
    methods: {
        select: function (value) {
            if (!this.disabled) {
                this.$emit('select', value)
            }
        },
        focus () {
            this.$refs.input?.focus()
        },
        blur () {
            this.$refs.input?.blur()
        }
    }
}
</script>
