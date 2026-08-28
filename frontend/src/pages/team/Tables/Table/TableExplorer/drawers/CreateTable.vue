<template>
    <div id="create-table" class="p-4">
        <div class="content-wrapper">
            <div class="section table-name">
                <h3>{{ $t('ui.defineName') }}</h3>
                <ff-text-input
                    v-model="newTable.name"
                    :placeholder="$t('ui.yourTableSNewName')"
                    type="string"
                    :error="errors.name"
                    @change="validateForm"
                />
                <div v-if="errors.name" data-el="form-row-error" class="ml-4 text-red-400 text-xs">
                    {{ errors.name }}
                </div>
                <p class="schema-hint">{{ $t('ui.thisTableWillBeCreatedInYourDatabaseSDefaultSche') }}</p>
            </div>
            <div class="section table-columns">
                <h3>{{ $t('ui.defineColumns') }}</h3>
                <div class="header grid grid-cols-12 gap-1 mb-1">
                    <span class="col-span-3 title">{{ $t('ui.name') }}</span>
                    <span class="col-span-3 title">{{ $t('ui.type') }}</span>
                    <span class="col-span-4 title">{{ $t('ui.default') }}</span>
                    <!-- <span class="col-span-2 title">{{ $t('ui.options') }}</span>-->
                    <span class="col-span-1 title">{{ $t('ui.allowNull') }}</span>
                    <!-- <span class="col-span-1 title -ml-2">{{ $t('ui.unsigned') }}</span>-->
                </div>
                <ul class="columns">
                    <li v-for="(column, $key) in newTable.columns" :key="$key">
                        <table-column :column="column" @remove="removeNewTableColumn($key)" />
                    </li>
                </ul>
                <div v-if="errors.columns" data-el="form-row-error" class="ml-4 text-red-400 text-xs text-center p-5">
                    {{ errors.columns }}
                </div>
                <ff-button type="button" kind="secondary" class="w-full" @click="addNewTableColumn">{{ $t('ui.addANewColumn') }}</ff-button>
            </div>
        </div>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'
import { defineComponent } from 'vue'

import { t } from '../../../../../../i18n.js'

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
                this.errors.name = t('ui.theTableNameMustBeAString')
            } else if (this.newTable.name.length === 0) {
                this.errors.name = t('ui.aTableNameIsMandatory')
            } else if (this.newTable.name.length > 63) {
                this.errors.name = t('ui.theTableNameMustNotExceed63Characters')
            } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.newTable.name)) {
                this.errors.name = t('ui.noSpacesAllowedMustStartWithALetterOrUnderscoreA')
            } else {
                this.errors.name = null
            }

            // Handle errors associated to column definitions
            if (this.newTable.columns.length === 0) {
                this.errors.columns = t('ui.theTableMustHaveAtLeastOneColumn')
            } else if (columnsHaveDuplicateNames) {
                this.errors.columns = t('ui.columnsMustHaveDifferentNames')
            } else if (allColumnDoesntHaveATypeAssigned) {
                this.errors.columns = t('ui.allColumnsMustHaveATypeAssigned')
            } else if (allColumnHasNoName) {
                this.errors.columns = t('ui.allColumnsMustHaveAName')
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
                title: t('ui.createNewTable'),
                actions: [
                    { handler: this.closeRightDrawer, label: t('ui.cancel'), kind: 'secondary' },
                    { handler: this.submit, label: t('ui.save'), kind: 'primary', disabled: this.hasErrors }
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
