<template>
    <div class="ff-data-table">
        <div v-if="showOptions" class="ff-data-table--options">
            <ff-text-input v-if="showSearch" class="ff-data-table--search"
                :placeholder="searchPlaceholder" v-model="filterTerm">
                <template v-slot:icon><SearchIcon /></template>
            </ff-text-input>
            <div class="ff-data-table--actions">
                <slot name="actions"></slot>
            </div>
        </div>
        <table class="ff-data-table--data">
            <slot name="table">
                <thead>
                    <slot name="header">
                        <ff-data-table-row>
                            <ff-data-table-cell v-for="(col, $index) in columns" :key="$index" :class="{'sorted': sort.key === col.key ,'sortable': col.sortable}" @click="sortBy(col)">
                                <div>
                                    {{ col.label }}
                                    <SwitchVerticalIcon class="ff-icon" v-if="col.sortable && col.key !== sort.key"/>
                                    <SortAscendingIcon class="ff-icon icon-sorted" v-if="col.sortable && col.key === sort.key && sort.order === 'asc'"/>
                                    <SortDescendingIcon class="ff-icon icon-sorted" v-if="col.sortable && col.key === sort.key && sort.order === 'desc'"/>
                                </div>
                            </ff-data-table-cell>
                            <ff-data-table-cell v-if="hasContextMenu"></ff-data-table-cell>
                        </ff-data-table-row>
                    </slot>
                </thead>
                <tbody>
                    <slot name="rows">
                        <ff-data-table-row v-for="(r, $index) in sortedRows" :key="$index" :data="r" :columns="columns"
                            :selectable="rowsSelectable" @click="rowClick(r)">
                            <template v-if="hasContextMenu" v-slot:context-menu>
                                <slot name="context-menu"></slot>
                            </template>
                        </ff-data-table-row>
                    </slot>
                </tbody>
            </slot>
        </table>
    </div>
</template>

<script>

// icons
import { SearchIcon, SwitchVerticalIcon, SortAscendingIcon, SortDescendingIcon } from '@heroicons/vue/outline'

export default {
    name: 'ff-data-table',
    emits: ['update:search'],
    props: {
        columns: {
            type: Array,
            default: null
        },
        rows: {
            type: Array,
            default: null
        },
        rowsSelectable: {
            type: Boolean,
            default: false
        },
        showSearch: {
            type: Boolean,
            default: false
        },
        searchPlaceholder: {
            type: String,
            default: null
        },
        search: {
            type: String,
            default: null
        }
    },
    computed: {
        showOptions: function () {
            return this.showSearch || this.$slots.actions
        },
        filterTerm: {
            get () {
                return this.search
            },
            set (value) {
                this.$emit('update:search', value)
            }
        },
        hasContextMenu: function () {
            return this.$slots['context-menu']
        },
        sortedRows: function () {
            if (this.sort.key) {
                const rows = this.rows
                return rows.sort((a, b) => {
                    if (this.sort.order === 'asc') {
                        return a[this.sort.key] - b[this.sort.key]
                    } else {
                        return b[this.sort.key] - a[this.sort.key]
                    }
                })
            } else {
                return this.rows
            }
        }
    },
    data () {
        return {
            sort: {
                key: '',
                order: 'desc'
            },
            orders: ['desc', 'asc']
        }
    },
    methods: {
        rowClick () {
            if (this.rowsSelectable) {
                this.$emit('row-selected')
            }
        },
        sortBy (col) {
            if (col.sortable) {
                if (this.sort.key === col.key) {
                    this.cycleOrder()
                } else {
                    this.sort.key = col.key
                    this.resetOrder()
                }
            }
        },
        cycleOrder () {
            if (this.sort.order === 'desc') {
                this.sort.order = 'asc'
            } else {
                this.sort.key = null
                this.sort.order = 'desc'
            }
        },
        resetOrder () {
            this.sort.order = this.orders[0]
        }
    },
    components: {
        SearchIcon,
        SwitchVerticalIcon,
        SortAscendingIcon,
        SortDescendingIcon
    }
}
</script>
