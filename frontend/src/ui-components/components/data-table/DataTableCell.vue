<template>
    <td class="ff-data-table--cell" :class="{'highlight': highlight}" :colspan="colspan">
        <slot />
    </td>
</template>

<script>
export default {
    name: 'FfDataTableCell',
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
