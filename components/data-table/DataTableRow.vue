<template>
    <tr class="ff-data-table--row" @click="$emit('selected')">
        <slot>
            <ff-data-table-cell v-for="col in columns" :key="col.label">
                {{ data[col.key] }}
            </ff-data-table-cell>
        </slot>
        <ff-data-table-cell v-if="hasContextMenu">
            <ff-kebab-menu menu-align="right">
                <slot name="context-menu">
                    <ff-list-item label="Option 1" @click="doSomething()"/>
                    <ff-list-item label="Option 2" @click="doSomething()"/>
                    <ff-list-item label="Option 3" @click="doSomething()"/>
                </slot>
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
        }
    },
    computed: {
        hasContextMenu: function () {
            return this.$slots['context-menu']
        }
    }
}
</script>
