<template>
    <div class="ff-data-table">
        <div v-if="showOptions" class="ff-data-table--options">
            <ff-text-input class="ff-data-table--search" :placeholder="searchPlaceholder" v-model="filterTerm"/>
            <div class="ff-data-table--actions">
                <slot name="actions"></slot>
            </div>
        </div>
        <table class="ff-data-table--data">
            <slot name="table">
                <thead>
                    <slot name="thead">
                        <ff-data-table-row>
                            <ff-data-table-cell v-for="(col, $index) in columns" :key="$index">
                                {{ col.label }}
                            </ff-data-table-cell>
                        </ff-data-table-row>
                    </slot>
                </thead>
                <tbody>
                    <slot name="tbody">
                        <ff-data-table-row v-for="(r, $index) in rows" :key="$index" :data="r" :columns="columns"
                            :class="{'selectable': rowsSelectable}" @click="rowClick(r)"></ff-data-table-row>
                    </slot>
                </tbody>
            </slot>
        </table>
    </div>
</template>

<script>

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
        }
    },
    methods: {
        rowClick () {
            if (this.rowsSelectable) {
                this.$emit('row-selected')
            }
        }
    }
}
</script>
