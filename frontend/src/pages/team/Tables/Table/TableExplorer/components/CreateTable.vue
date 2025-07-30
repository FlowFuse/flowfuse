<template>
    <div id="create-table">
        <div class="header">
            <div class="flex content">
                <h2 class="title flex-grow">Create a new table</h2>
            </div>
        </div>
        <div class="content-wrapper">
            <div class="section table-name">
                <h3>Define name</h3>
                <ff-text-input
                    v-model="tableName"
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
                    <span class="col-span-1 title">Nullable</span>
                    <!-- <span class="col-span-1 title -ml-2">Unsigned</span>-->
                </div>
                <ul class="columns">
                    <li v-for="(column, $key) in columns" :key="$key">
                        <table-column :column="column" @remove="removeColumn($key)" />
                    </li>
                </ul>
                <div v-if="errors.columns" data-el="form-row-error" class="ml-4 text-red-400 text-xs text-center p-5">
                    {{ errors.columns }}
                </div>
                <ff-button type="button" kind="secondary" class="w-full" @click="onNewColumn">Add a new column</ff-button>
            </div>
        </div>
        <div class="footer flex gap-3">
            <ff-button type="button" kind="secondary" class="w-full" @click="closeRightDrawer">Cancel</ff-button>
            <ff-button
                type="button"
                kind="primary"
                class="w-full"
                :disabled="!areColumnsValid || hasErrors"
                @click="submit"
            >
                Save
            </ff-button>
        </div>
    </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapActions, mapGetters } from 'vuex'

import TableColumn from './TableColumn.vue'
const emptyColumn = {
    name: '',
    type: '',
    nullable: false,
    default: '',
    hasDefault: false,
    unsigned: false
}

export default defineComponent({
    name: 'CreateTable',
    components: { TableColumn },
    data () {
        return {
            columns: [{ ...emptyColumn }],
            tableName: '',
            errors: { }
        }
    },
    computed: {
        ...mapGetters('account', ['team']),
        areColumnsValid () {
            return !this.columns.map(col => {
                if (col._errors_ === true) return true
                return !col.name || !col.type
            }).includes(true)
        },

        hasErrors () {
            return Object.keys(this.errors).length > 0
        }
    },
    watch: {
        columns: {
            deep: true,
            handler: 'validateForm'
        }
    },
    methods: {
        ...mapActions('ux', ['closeRightDrawer']),
        ...mapActions('product/tables', ['createTable']),
        onNewColumn () {
            this.columns.push({ ...emptyColumn })
        },
        removeColumn (key) {
            this.columns.splice(key, 1)
        },
        validateForm () {
            const columnsHaveDuplicateNames = new Set(this.columns.map(col => col.name)).size !== this.columns.length

            // PostgreSQL identifiers:
            // - max 63 bytes (can be less than 63 characters if multibyte)
            // - must begin with a letter or underscore
            // - can contain letters, digits, and underscores
            switch (true) {
            case typeof this.tableName !== 'string':
                this.errors.name = 'The table name must be a string.'
                break
            case this.tableName.length === 0:
                this.errors.name = 'A table name is mandatory.'
                break
            case this.tableName.length > 63:
                this.errors.name = 'The table name must not exceed 63 characters.'
                break
            case !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.tableName):
                this.errors.name = 'The table name must have a valid format.'
                break
            case this.columns.length === 0:
                this.errors.columns = 'The table must have at least one column.'
                break
            case columnsHaveDuplicateNames:
                this.errors.columns = 'Columns must have different names.'
                break
            default:
                this.errors = { }
            }
        },
        submit () {
            const sanitizedColumns = this.columns.map(col => {
                if (!col.hasDefault) delete col.default
                if (!col.unsigned) delete col.unsigned
                return col
            })

            return this.createTable({
                teamId: this.team.id,
                databaseId: this.$route.params.id,
                tableName: this.tableName,
                columns: sanitizedColumns
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
        background-color: $ff-grey-100;
        overflow: auto;
        padding: 12px;

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
    }
}
</style>
