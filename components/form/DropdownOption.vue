<template>
    <div class="ff-dropdown-option" @click="select()">
        <slot>{{ label }}</slot>
    </div>
</template>

<script>
export default {
    name: 'ff-dropdown-option',
    props: {
        // eslint-disable-next-line vue/require-prop-types
        value: {
            default: null
        },
        // eslint-disable-next-line vue/require-prop-types
        label: {
            default: ''
        }
    },
    methods: {
        select () {
            this.$parent.value = {
                value: this.value,
                label: this.label
            }
        }
    }
}
</script>
