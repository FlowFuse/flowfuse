<template>
    <div class="ff-dropdown-option" @click="select()">
        {{ label }}
    </div>
</template>

<script>
export default {
    name: 'ff-dropdown-option',
    props: {
        value: {
            default: null
        },
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
