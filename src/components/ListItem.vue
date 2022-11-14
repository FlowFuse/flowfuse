<template>
    <li class="ff-list-item" :class="[className, this.disabled ? 'disabled' : ''] ">
        <component :is="icon" />
        <label>{{ label }}</label>
    </li>
</template>

<script>
export default {
    name: 'ff-list-item',
    props: {
        icon: {
            type: Function,
            default: null
        },
        label: {
            type: String,
            default: ''
        },
        kind: {
            type: String,
            default: ''
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        className () {
            return 'ff-list-item--' + this.kind
        }
    }
}
</script>
