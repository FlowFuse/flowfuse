<template>
    <td class="ff-data-table--cell" :class="{'highlight': highlight}" :colspan="colspan" data-el="ff-data-cell">
        <slot></slot>
    </td>
</template>

<script>
export default {
    name: 'ff-data-table-cell',
    props: {
        colspan: {
            type: Number,
            default: 1
        },
        highlight: {
            type: Boolean,
            default: false
        }
    }
}
</script>
