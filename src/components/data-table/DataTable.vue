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
                            <ff-data-table-cell v-for="(col, $index) in columns" :key="$index"
                                :class="[sort.key === col.key ? 'sorted' : '', col.sortable ? 'sortable' : ''].concat(col.classes)"
                                :style="col.style"
                                @click="sortBy(col)">
                                <!-- Internal div required to have flex w/sorting icons -->
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
                        <ff-data-table-row v-if="loading">
                            <ff-data-table-cell class="status-message" :colspan="columns.length">{{ loadingMessage }}</ff-data-table-cell>
                        </ff-data-table-row>
                        <template v-if="!loading">
                            <ff-data-table-row v-for="(r, $index) in sortedRows" :key="$index" :data="r" :columns="columns"
                                :selectable="rowsSelectable" @click="rowClick(r)">
                                <template v-if="hasContextMenu" v-slot:context-menu>
                                    <slot name="context-menu"></slot>
                                </template>
                            </ff-data-table-row>
                        </template>
                        <ff-data-table-row v-if="!loading && sortedRows.length === 0">
                            <ff-data-table-cell class="status-message" :colspan="columns.length">No Data Found</ff-data-table-cell>
                        </ff-data-table-row>
                    </slot>
                </tbody>
            </slot>
        </table>
        <div v-if="showLoadMore" class="ff-loadmore">
            <span @click="$emit('load-more')">Load More...</span>
        </div>
    </div>
</template>

<script>

// icons
import { SearchIcon, SwitchVerticalIcon, SortAscendingIcon, SortDescendingIcon } from '@heroicons/vue/outline'

export default {
    name: 'ff-data-table',
    emits: ['update:search', 'load-more'],
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
        },
        showLoadMore: {
            type: Boolean,
            default: false
        },
        loading: {
            type: Boolean,
            default: false
        },
        loadingMessage: {
            type: String,
            default: 'Loading Data...'
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
                return [...this.rows].sort((a, b) => {
                    if (this.sort.order === 'asc') {
                        if (a[this.sort.key] < b[this.sort.key]) {
                            return 1
                        } else if (a[this.sort.key] > b[this.sort.key]) {
                            return -1
                        } else {
                            return 0
                        }
                    } else {
                        if (a[this.sort.key] < b[this.sort.key]) {
                            return -1
                        } else if (a[this.sort.key] > b[this.sort.key]) {
                            return 1
                        } else {
                            return 0
                        }
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
            pagination: {
                active: -1,
                max: -1
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
