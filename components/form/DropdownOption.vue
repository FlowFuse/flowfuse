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
            default: null,
            type: [Number, String, Boolean]
        },
        label: {
            default: null,
            type: String
        }
    },
    methods: {
        select () {
            this.$parent.value = {
                value: this.value,
                label: this.label
            }
        },
        registerOption (option) {
            this.$parent.registerOption(option)
        }
    },
    mounted () {
        this.registerOption({
            value: this.value,
            label: this.label
        })
    }
}
</script>
