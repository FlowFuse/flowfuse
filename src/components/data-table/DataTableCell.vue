<template>
    <td class="ff-data-table--cell" :colspan="colspan">
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
        }
    }
}
</script>
