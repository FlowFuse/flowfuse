<template>
    <div class="ff-data-table">
        <div v-if="showOptions" class="ff-data-table--options">
            <ff-text-input v-if="showSearch" class="ff-data-table--search"
                :placeholder="searchPlaceholder" v-model="filterTerm"
            >
                <template #icon><SearchIcon /></template>
            </ff-text-input>
            <div class="ff-data-table--actions" v-if="$slots.actions">
                <slot name="actions"></slot>
            </div>
        </div>
        <table class="ff-data-table--data">
            <slot name="table">
                <thead>
                    <!-- HEADERS -->
                    <slot name="header">
                        <ff-data-table-row>
                            <ff-data-table-cell v-for="(col, $index) in columns" :key="$index"
                                :class="[sort.key === col.key ? 'sorted' : '', col.sortable ? 'sortable' : ''].concat(col.class)"
                                :style="col.style"
                                @click="sortBy(col, $index)"
                            >
                                <!-- Internal div required to have flex w/sorting icons -->
                                <div>
                                    {{ col.label }}
                                    <SwitchVerticalIcon class="ff-icon ff-icon-sm" v-if="col.sortable && col.key !== sort.key" />
                                    <SortAscendingIcon class="ff-icon ff-icon-sm icon-sorted" v-if="col.sortable && col.key === sort.key && sort.order === 'asc'" />
                                    <SortDescendingIcon class="ff-icon ff-icon-sm icon-sorted" v-if="col.sortable && col.key === sort.key && sort.order === 'desc'" />
                                </div>
                            </ff-data-table-cell>
                            <ff-data-table-cell v-if="hasContextMenu"></ff-data-table-cell>
                        </ff-data-table-row>
                    </slot>
                </thead>
                <tbody>
                    <!-- ROWS -->
                    <slot name="rows">
                        <ff-data-table-row v-if="loading">
                            <ff-data-table-cell class="status-message" :colspan="messageColSpan">{{ loadingMessage }}</ff-data-table-cell>
                        </ff-data-table-row>
                        <template v-if="!loading">
                            <ff-data-table-row v-for="(r, $index) in filteredRows" :key="$index" :data="r" :columns="columns"
                                :selectable="rowsSelectable" :highlight-cell="sort.highlightColumn" @click="rowClick(r)"
                            >
                                <template v-if="hasContextMenu" #context-menu="{row}">
                                    <slot name="context-menu" :row="row"></slot>
                                </template>
                            </ff-data-table-row>
                        </template>
                        <ff-data-table-row v-if="!loading && rows?.length > 0 && filteredRows?.length === 0">
                            <ff-data-table-cell class="status-message" :colspan="messageColSpan">No Data Found. Try Another Search.</ff-data-table-cell>
                        </ff-data-table-row>
                        <ff-data-table-row v-else-if="!loading && filteredRows?.length === 0">
                            <ff-data-table-cell class="status-message" :colspan="messageColSpan">{{ noDataMessage }}</ff-data-table-cell>
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

function searchObjectProps (object, searchTerm, searchProps = []) {
    const searchPropsMap = searchProps
        .map((prop) => {
            const [first, ...rest] = prop.split('.')

            return [first, rest.join('.')]
        })
        .reduce((map, [propName, subProp]) => {
            if (!map.has(propName)) {
                map.set(propName, [subProp])
            } else {
                map.get(propName).push(subProp)
            }

            return map
        }, new Map())

    return Object.entries(object).some(([propName, propValue]) => {
        // Skip props that aren't being considered
        if (searchPropsMap?.size > 0 && !searchPropsMap.has(propName)) {
            return false
        }

        // Skip null, undefined, or empty props (inc arrays) since they'll never match
        if (propValue === null || propValue === undefined || propValue.length === 0) {
            return false
        }

        // Search recursively inside of objects
        if (typeof propValue === 'object') {
            return searchObjectProps(propValue, searchTerm, searchPropsMap.get(propName))
        }

        // Skip non numeric strings (bool, undefined, null, etc)
        if (typeof propValue === 'number') {
            propValue = propValue.toString()
        }
        if (typeof propValue !== 'string') {
            return false
        }

        return propValue.toLowerCase().includes(searchTerm)
    })
}

export default {
    name: 'ff-data-table',
    emits: ['update:search', 'load-more', 'row-selected'],
    props: {
        columns: {
            type: Array,
            default: () => []
        },
        rows: {
            type: Array,
            default: () => []
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
        searchFields: {
            type: Array,
            default: () => []
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
        },
        noDataMessage: {
            type: String,
            default: 'No Data Found'
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
                this.internalSearch = value
                this.$emit('update:search', value)
            }
        },
        hasContextMenu: function () {
            return this.$slots['context-menu']
        },
        messageColSpan: function () {
            return this.hasContextMenu ? this.columns.length + 1 : this.columns.length
        },
        filteredRows: function () {
            const rows = this.filterRows([...this.rows])
            if (this.sort.key) {
                return rows.sort((a, b) => {
                    // Catch undefined and null, swapping to ''
                    const aProp = this.lookupProperty(a, this.sort.key) ?? ''
                    const bProp = this.lookupProperty(b, this.sort.key) ?? ''

                    const collator = new Intl.Collator(undefined, {
                        numeric: true,
                        sensitivity: 'base'
                    })

                    // Ordering
                    const [aValue, bValue] =
                        this.sort.order === 'asc'
                            ? [aProp, bProp]
                            : [bProp, aProp]

                    // Booleans are grouped together, sorted as booleans, not strings
                    if (
                        typeof aValue === 'boolean' &&
                        typeof bValue === 'boolean'
                    ) {
                        return aValue === bValue ? 0 : (aValue > bValue ? 1 : -1)
                    } else if (
                        typeof aValue === 'boolean' ||
                        typeof bValue === 'boolean'
                    ) {
                        return this.sort.order === 'asc' ? -1 : 1
                    }

                    return collator.compare(aValue, bValue)
                })
            } else {
                return rows
            }
        }
    },
    data () {
        return {
            internalSearch: '',
            sort: {
                highlightColumn: null,
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
        filterRows (rows) {
            const search = this.internalSearch
            if (!search) {
                return rows
            }

            return rows.filter((row) => {
                return searchObjectProps(row, search.toLowerCase(), this.searchFields)
            })
        },
        rowClick (row) {
            if (this.rowsSelectable) {
                this.$emit('row-selected', row)
            }
        },
        sortBy (col, colIndex) {
            if (col.sortable) {
                if (this.sort.key === col.key) {
                    this.cycleOrder()
                } else {
                    this.sort.key = col.key
                    this.resetOrder()
                }
                if (this.sort.key) {
                    this.sort.highlightColumn = colIndex
                } else {
                    this.sort.highlightColumn = null
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
    },
    components: {
        SearchIcon,
        SwitchVerticalIcon,
        SortAscendingIcon,
        SortDescendingIcon
    }
}
</script>
