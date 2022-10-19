<template>
    <label class="ff-radio-btn" @click="select(value)">
        <input type="radio" :value="value" />
        <span class="checkbox" :checked="checked"></span>
        <label>{{ label }}</label>
    </label>
</template>

<script>
export default {
    name: 'ff-radio-button',
    // eslint-disable-next-line vue/require-prop-types
    props: ['label', 'value', 'checked'],
    emits: ['select'],
    methods: {
        select: function (value) {
            this.$emit('select', value)
        }
    }
}
</script>
