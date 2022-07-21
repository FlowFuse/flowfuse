<template>
    <tr class="ff-data-table--row" :class="{'selectable': selectable}" @click="$emit('selected', data)">
        <slot>
            <ff-data-table-cell v-for="col in columns" :key="col.label">
                {{ data[col.key] }}
            </ff-data-table-cell>
        </slot>
        <ff-data-table-cell v-if="hasContextMenu" style="width: 50px">
            <ff-kebab-menu menu-align="right">
                <slot name="context-menu"></slot>
            </ff-kebab-menu>
        </ff-data-table-cell>
    </tr>
</template>

<script>
export default {
    name: 'ff-data-table-row',
    props: {
        columns: {
            type: Array,
            default: null
        },
        data: {
            type: Object,
            default: null
        },
        selectable: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        hasContextMenu: function () {
            return this.$slots['context-menu']
        }
    }
}
</script>
