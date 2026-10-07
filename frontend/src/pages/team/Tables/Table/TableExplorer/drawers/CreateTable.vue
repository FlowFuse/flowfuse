<template>
    <div id="create-table" class="p-4">
        <div class="content-wrapper">
            <div class="section table-name">
                <h3>Define name</h3>
                <ff-text-input
                    v-model="newTable.name"
                    placeholder="Your table's new name"
                    type="string"
                    :error="errors.name"
                    @change="validateForm"
                />
                <div v-if="errors.name" data-el="form-row-error" class="ml-4 text-red-400 text-xs">
                    {{ errors.name }}
                </div>
            </div>
            <div class="section table-schema">
                <h3>Define schema</h3>
                <ff-text-input
                    v-model="newTable.schema"
                    placeholder="public"
                    type="string"
                    :error="errors.schema"
                    @change="validateForm"
                />
                <div v-if="errors.schema" data-el="form-row-error" class="ml-4 text-red-400 text-xs">
                    {{ errors.schema }}
                </div>
                <p class="schema-hint">A schema that doesn't exist yet will be created.</p>
            </div>
            <div class="section table-columns">
                <h3>Define Columns</h3>
                <div class="header grid grid-cols-12 gap-1 mb-1">
                    <span class="col-span-3 title">Name</span>
                    <span class="col-span-3 title">Type</span>
                    <span class="col-span-4 title">Default</span>
                    <!-- <span class="col-span-2 title">Options</span>-->
                    <span class="col-span-1 title">Allow null</span>
                    <!-- <span class="col-span-1 title -ml-2">Unsigned</span>-->
                </div>
                <ul class="columns">
                    <li v-for="(column, $key) in newTable.columns" :key="$key">
                        <table-column :column="column" @remove="removeNewTableColumn($key)" />
                    </li>
                </ul>
                <div v-if="errors.columns" data-el="form-row-error" class="ml-4 text-red-400 text-xs text-center p-5">
                    {{ errors.columns }}
                </div>
                <ff-button type="button" kind="secondary" class="w-full" @click="addNewTableColumn">Add a new column</ff-button>
            </div>
        </div>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'
import { defineComponent } from 'vue'

import Alerts from '../../../../../../services/alerts.js'

import TableColumn from './components/TableColumn.vue'

import { useProductTablesStore } from '@/stores/product-tables.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

export default defineComponent({
    name: 'CreateTable',
    components: { TableColumn },
    data () {
        return {
            errors: { }
        }
    },
    computed: {
        ...mapState(useProductTablesStore, ['newTable']),
        hasErrors () {
            return Object.values(this.errors).some(v => v != null)
        }
    },
    watch: {
        'newTable.columns': {
            deep: true,
            handler: 'validateForm'
        },
        hasErrors () {
            // Synchronizes the header buttons' state with form validation, disabling save button when errors exist
            this.setHeader()
        }
    },
    mounted () {
        // newTable is persisted, so drafts saved before schema support have no schema
        if (!this.newTable.schema) {
            this.newTable.schema = 'public'
        }
        this.setHeader()
    },
    methods: {
        ...mapActions(useUxDrawersStore, ['closeRightDrawer', 'setRightDrawerHeader']),
        ...mapActions(useProductTablesStore, ['createTable', 'getTables', 'addNewTableColumn', 'removeNewTableColumn']),
        validateForm () {
            const columnsHaveDuplicateNames = new Set(this.newTable.columns.map(col => col.name)).size !== this.newTable.columns.length
            const allColumnDoesntHaveATypeAssigned = this.newTable.columns.some(col => !col.type)
            const allColumnHasNoName = this.newTable.columns.some(col => !col.name || col.name.trim() === '')

            // PostgreSQL identifiers:
            // - max 63 bytes (can be less than 63 characters if multibyte)
            // - must begin with a letter or underscore
            // - can contain letters, digits, and underscores
            if (typeof this.newTable.name !== 'string') {
                this.errors.name = 'The table name must be a string.'
            } else if (this.newTable.name.length === 0) {
                this.errors.name = 'A table name is mandatory.'
            } else if (this.newTable.name.length > 63) {
                this.errors.name = 'The table name must not exceed 63 characters.'
            } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.newTable.name)) {
                this.errors.name = 'No spaces allowed, must start with a letter or underscore, and only use letters, digits, or underscores.'
            } else {
                this.errors.name = null
            }

            if (typeof this.newTable.schema !== 'string' || this.newTable.schema.length === 0) {
                this.errors.schema = 'A schema is mandatory.'
            } else if (this.newTable.schema.length > 63) {
                this.errors.schema = 'The schema must not exceed 63 characters.'
            } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.newTable.schema)) {
                this.errors.schema = 'No spaces allowed, must start with a letter or underscore, and only use letters, digits, or underscores.'
            } else if (this.newTable.schema.startsWith('pg_') || this.newTable.schema === 'information_schema') {
                this.errors.schema = 'This schema name is reserved by PostgreSQL.'
            } else {
                this.errors.schema = null
            }

            // Handle errors associated to column definitions
            if (this.newTable.columns.length === 0) {
                this.errors.columns = 'The table must have at least one column.'
            } else if (columnsHaveDuplicateNames) {
                this.errors.columns = 'Columns must have different names.'
            } else if (allColumnDoesntHaveATypeAssigned) {
                this.errors.columns = 'All columns must have a type assigned.'
            } else if (allColumnHasNoName) {
                this.errors.columns = 'All columns must have a name.'
            } else {
                this.errors.columns = null
            }
        },
        submit () {
            this.validateForm()
            if (this.hasErrors) return

            return this.createTable({
                databaseId: this.$route.params.id
            })
                .then(() => this.getTables(this.$route.params.id))
                .then(() => {
                    Alerts.emit('Table created successfully', 'confirmation')
                    this.closeRightDrawer()
                })
                .catch(e => {
                    Alerts.emit(e.response?.data?.error || 'Failed to create the table', 'warning')
                })
        },
        setHeader () {
            this.setRightDrawerHeader({
                title: 'Create New Table',
                actions: [
                    { handler: this.closeRightDrawer, label: 'Cancel', kind: 'secondary' },
                    { handler: this.submit, label: 'Save', kind: 'primary', disabled: this.hasErrors }
                ]
            })
        }
    }
})
</script>

<style lang="scss">

#create-table {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: var(--ff-color-bg-surface);

    > .header {
        border-bottom: 1px solid var(--ff-color-border-strong);
        padding: 10px 0;
        width: 100%;
        background: var(--ff-color-bg-app);

        .content {
            padding: 0 12px;
            display: flex;
            align-items: baseline;

            .title {
                margin: 0;
                color: var(--ff-color-text);
                font-weight: bold;
                font-size: 1.25rem;
                line-height: 1.75rem;
            }
        }
    }

    .content-wrapper {
        flex: 1;
        width: 100%;
        background-color: var(--ff-color-bg-surface);
        overflow: auto;

       .section {
           padding-bottom: 15px;
           margin-bottom: 15px;
           border-bottom: 1px solid var(--ff-color-border);

           .header {
               .title {
                   color: var(--ff-color-text-deep);
                   font-size: 10px;
               }
           }

           .columns {
               margin-bottom: 20px;
           }

           .schema-hint {
               margin-top: 8px;
               font-size: 0.75rem;
               color: var(--ff-color-text-subtle);
           }
       }
    }

    .footer {
        padding: 10px 12px;
        border-top: 1px solid var(--ff-color-border-strong);
        background: var(--ff-color-bg-app);
    }
}
</style>
