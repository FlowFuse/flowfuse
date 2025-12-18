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
import { defineComponent } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import TableColumn from './components/TableColumn.vue'
export default defineComponent({
    name: 'CreateTable',
    components: { TableColumn },
    data () {
        return {
            errors: { }
        }
    },
    computed: {
        ...mapGetters('account', ['team']),
        ...mapState('product/tables', ['newTable']),
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
        this.setHeader()
    },
    methods: {
        ...mapActions('ux/drawers', ['closeRightDrawer', 'setRightDrawerHeader']),
        ...mapActions('product/tables', ['createTable', 'getTables', 'addNewTableColumn', 'removeNewTableColumn']),
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
                .then(() => this.closeRightDrawer())
                .catch(e => e)
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
    background: $ff-grey-50;

    > .header {
        border-bottom: 1px solid $ff-grey-300;
        padding: 10px 0;
        width: 100%;
        background: $ff-white;

        .content {
            padding: 0 12px;
            display: flex;
            align-items: baseline;

            .title {
                margin: 0;
                color: $ff-grey-800;
                font-weight: bold;
                font-size: 1.25rem;
                line-height: 1.75rem;
            }
        }
    }

    .content-wrapper {
        flex: 1;
        width: 100%;
        background-color: $ff-grey-50;
        overflow: auto;

       .section {
           padding-bottom: 15px;
           margin-bottom: 15px;
           border-bottom: 1px solid $ff-grey-200;

           .header {
               .title {
                   color: $ff-grey-600;
                   font-size: 10px;
               }
           }

           .columns {
               margin-bottom: 20px;
           }
       }
    }

    .footer {
        padding: 10px 12px;
        border-top: 1px solid $ff-grey-300;
        background: $ff-white;
    }
}
</style>
