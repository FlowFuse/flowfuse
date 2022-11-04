<template>
    <label class="ff-radio-btn" @click="select(value)">
        <input type="radio" :value="value" />
        <span class="checkbox" :checked="checked"></span>
        <label>{{ label }}</label>
        <p v-if="showDescription" class="ff-description">{{ description }}</p>
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
        showDescription: {
            default: false,
            type: Boolean
        }
    },
    emits: ['select'],
    methods: {
        select: function (value) {
            this.$emit('select', value)
        }
    }
}
</script>
