<template>
    <div class="ff-data-table">
        <div v-if="showOptions" class="ff-data-table--options">
            <ff-text-input
                v-if="showSearch" v-model="filterTerm" class="ff-data-table--search"
                :disabled="disabled"
                data-form="search" :placeholder="searchPlaceholder"
            >
                <template #icon><SearchIcon /></template>
            </ff-text-input>
            <div v-if="$slots.actions" class="ff-data-table--actions">
                <slot name="actions" />
            </div>
        </div>
        <table class="ff-data-table--data" :class="tableClass ?? ''">
            <slot name="table">
                <thead>
                    <!-- HEADERS -->
                    <slot name="header">
                        <ff-data-table-row>
                            <ff-data-table-cell v-if="showRowCheckboxes" class="w-5">
                                <ff-checkbox v-model="allChecked" data-action="check-all" @click="toggleAllChecks" />
                            </ff-data-table-cell>
                            <ff-data-table-cell
                                v-for="(col, $index) in columns" :key="$index"
                                :class="[sort.key === col.key ? 'sorted' : '', col.sortable ? 'sortable' : '', col.headerClass ?? ''].concat(col.class)"
                                :style="col.headerStyle ?? col.style"
                                @click="sortBy(col, $index)"
                            >
                                <!-- Internal div required to have flex w/sorting icons -->
                                <div :class="col.tableCellClass ?? ''">
                                    <span v-if="col.html" :class="col.tableLabelClass ?? ''" v-html="col.html"> </span>
                                    <span v-else :class="col.tableLabelClass ?? ''">{{ col.label }}</span>
                                    <SwitchVerticalIcon v-if="col.sortable && col.key !== sort.key" class="ff-icon ff-icon-sm" />
                                    <SortAscendingIcon v-if="col.sortable && col.key === sort.key && sort.order === 'asc'" class="ff-icon ff-icon-sm icon-sorted" />
                                    <SortDescendingIcon v-if="col.sortable && col.key === sort.key && sort.order === 'desc'" class="ff-icon ff-icon-sm icon-sorted" />
                                </div>
                            </ff-data-table-cell>

                            <ff-data-table-cell v-if="hasRowActions" />
                            <ff-data-table-cell v-if="hasContextMenu" />
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
                            <ff-data-table-row
                                v-for="(r, $index) in filteredRows" :key="$index" :data="r" :columns="columns"
                                :selectable="rowsSelectable" :highlight-cell="sort.highlightColumn" @selected="rowClick(r, $event)"
                            >
                                <template v-if="showRowCheckboxes" #row-prepend="{row}">
                                    <ff-checkbox v-model="checks[row[checkKeyProp]]" />
                                </template>
                                <template v-if="hasRowActions" #row-actions="{row}">
                                    <slot name="row-actions" :row="row" />
                                </template>
                                <template v-if="hasContextMenu" #context-menu="{row}">
                                    <slot name="context-menu" :row="row" />
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
            <span data-action="load-more" @click="$emit('load-more')">Load More...</span>
        </div>
    </div>
</template>

<script>

// icons
import { SearchIcon, SortAscendingIcon, SortDescendingIcon, SwitchVerticalIcon } from '@heroicons/vue/outline'

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

        if (searchTerm.includes('|')) {
            const terms = searchTerm.split('|').filter(t => t)
            return terms.some(term => propValue.toLowerCase().includes(term.trim().toLowerCase()))
        }

        return propValue.toLowerCase().includes(searchTerm)
    })
}

export default {
    name: 'ff-data-table',
    components: {
        SearchIcon,
        SwitchVerticalIcon,
        SortAscendingIcon,
        SortDescendingIcon
    },
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
            type: [Boolean, Function],
            default: false
        },
        showRowCheckboxes: {
            type: Boolean,
            default: false
        },
        checkKeyProp: {
            type: String,
            default: 'id'
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
        initialSortKey: {
            type: String,
            default: ''
        },
        initialSortOrder: {
            type: String,
            default: 'desc'
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
        },
        disabled: {
            required: false,
            default: false,
            type: Boolean
        },
        tableClass: {
            required: false,
            default: '',
            type: String
        }
    },
    emits: ['update:search', 'load-more', 'row-selected', 'update:sort', 'rows-checked'],
    data () {
        return {
            checks: {},
            // allChecked: false,
            internalSearch: '',
            sort: {
                highlightColumn: null,
                key: '',
                order: 'desc'
            },
            orders: ['desc', 'asc']
        }
    },
    computed: {
        showOptions: function () {
            return this.showSearch || this.$slots.actions
        },
        filterTerm: {
            get () {
                return this.search || this.internalSearch
            },
            set (value) {
                const valueChanged = value !== this.internalSearch
                this.internalSearch = value
                if (valueChanged) {
                    this.$emit('update:search', value)
                }
            }
        },
        hasRowActions: function () {
            return this.$slots['row-actions']
        },
        hasContextMenu: function () {
            return this.$slots['context-menu']
        },
        messageColSpan: function () {
            let colspan = this.columns.length
            if (this.hasRowActions) {
                colspan++
            }
            if (this.hasContextMenu) {
                colspan++
            }
            if (this.showRowCheckboxes) {
                colspan++
            }
            return colspan
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
        },
        allChecked: function () {
            const isChecked = (row) => !!this.checks[row[this.checkKeyProp]]
            return this.filteredRows.map(isChecked).every((v) => v)
        },
        checkedRows: function () {
            return this.filteredRows.filter((row) => this.checks[row[this.checkKeyProp]])
        }
    },
    watch: {
        checkedRows: {
            handler (value) {
                this.$emit('rows-checked', this.checkedRows)
            }
        }
    },
    mounted () {
        if (this.$route?.query?.searchQuery) {
            this.internalSearch = this.$route.query.searchQuery
        }
        this.sort.key = this.initialSortKey
        this.sort.order = this.orders.includes(this.initialSortOrder) ? this.initialSortOrder : this.orders[0]
    },
    methods: {
        toggleAllChecks (pointerEvents) {
            pointerEvents.stopPropagation()
            pointerEvents.preventDefault()
            const isChecked = !this.allChecked
            if (!isChecked) {
                this.checks = {}
                return
            }
            this.filteredRows.forEach((row) => {
                this.checks[row[this.checkKeyProp]] = true
            })
        },
        filterRows (rows) {
            const search = this.internalSearch
            if (!search) {
                return rows
            }

            return rows.filter((row) => {
                return searchObjectProps(row, search.toLowerCase(), this.searchFields)
            })
        },
        rowClick (row, $event) {
            if (this.rowsSelectable) {
                this.$emit('row-selected', row, $event._event)
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

                this.$emit('update:sort', this.sort.key, this.sort.order)
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
    }
}
</script>
