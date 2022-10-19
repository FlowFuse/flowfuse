<template>
    <div class="ff-dropdown-option" @click="select()">
        <slot>{{ label }}</slot>
    </div>
</template>

<script>
export default {
    name: 'ff-dropdown-option',
    props: {
        value: {
            required: true,
            type: String
        },
        label: {
            required: true,
            type: String
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
