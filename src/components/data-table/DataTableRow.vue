<!-- eslint-disable vue/require-explicit-emits -->
<template>
    <tr class="ff-data-table--row" :class="{'selectable': selectable}" @click="$emit('selected', data)">
        <slot>
            <ff-data-table-cell v-for="(col, $column) in columns" :key="col.label" :class="col.class" :style="col.style" :highlight="highlightCell === $column">
                <template v-if="col.component">
                    <component :is="col.component.is" v-bind="getCellData(data, col)"></component>
                </template>
                <template v-else-if="!isBool(lookupProperty(data, col.key))">
                    {{ lookupProperty(data, col.key) }}
                </template>
                <template v-else>
                    <ff-check :value="lookupProperty(data, col.key)" />
                </template>
            </ff-data-table-cell>
        </slot>
        <ff-data-table-cell v-if="hasContextMenu" style="width: 50px">
            <ff-kebab-menu menu-align="right">
                <slot name="context-menu" :row="data" message="hello world"></slot>
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
        },
        highlightCell: {
            type: Number,
            default: null
        }
    },
    computed: {
        hasContextMenu: function () {
            return this.$slots['context-menu']
        }
    },
    methods: {
        isBool: function (value) {
            return typeof (value) === 'boolean'
        },
        getCellData: function (data, col) {
            if (col.component?.map) {
                // create a clone of data in case we override existing properties
                // this is okay, as long as it's contained within a cell.
                // e.g. a component may look for an "id" re: a user, but the whole row
                // may be linked to a template, which has it's own "id"
                const cell = Object.assign({}, data)
                // map the relevant properties in accordance to the provided map
                const dataMap = col.component?.map
                for (const [to, from] of Object.entries(dataMap)) {
                    cell[to] = this.lookupProperty(cell, from)
                }
                return cell
            } else {
                return data
            }
        },
        lookupProperty (obj, property) {
            const parts = property.split('.')
            if (parts.length === 1) {
                return obj[property]
            } else {
                while (parts.length > 0) {
                    const part = parts.shift()
                    if (Object.hasOwn(obj, part)) {
                        obj = obj[part]
                    } else {
                        return undefined
                    }
                }
            }
            return obj
        }
    }
}
</script>
