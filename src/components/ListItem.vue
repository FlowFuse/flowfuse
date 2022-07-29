<template>
    <li class="ff-list-item" :class="'ff-list-item--' + kind">
        <component :is="icon" />
        <label>{{ label }}</label>
    </li>
</template>

<script>
export default {
    name: 'ff-list-item',
    props: {
        icon: {
            type: Function
        },
        label: {
            type: String,
            default: ''
        },
        kind: {
            type: String,
            default: ''
        }
    }
}
</script>
