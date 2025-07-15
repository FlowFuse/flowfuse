<template>
    <section id="tables-list">
        <div class="header flex gap-2">
            <ff-text-input
                v-model="filterTerm"
                class="ff-data-table--search"
                data-form="search"
                placeholder="Search Tables"
            >
                <template #icon><SearchIcon /></template>
            </ff-text-input>

            <!--            <ff-button kind="secondary" @click="onCreateTable">-->
            <!--                <template #icon>-->
            <!--                    <PlusIcon />-->
            <!--                </template>-->
            <!--            </ff-button>-->
        </div>

        <ul v-if="filteredTables.length && tables.length" class="list">
            <li
                v-for="table in filteredTables" :key="table.id"
                :title="table.name"
                class="item"
                @click="updateTableSelection(table.name)"
            >
                <TableIcon class="ff-icon ff-icon-sm" style="min-width: 24px;" />
                <span class="truncate">{{ table.name }}</span>
            </li>
        </ul>

        <div v-else-if="!filteredTables.length && tables.length" class="empty-state">
            <p>No tables found matching your criteria!</p>
        </div>

        <div v-else class="empty-state">
            <p>Ready to organize your data?</p>
            <p>Create your first table by connecting to the Database using Node-RED</p>
            <!--            <p><span class="cta" @click="onCreateTable">Create</span> your first table now.</p>-->
        </div>
    </section>
</template>

<script>
import { SearchIcon, TableIcon } from '@heroicons/vue/outline'
import { defineComponent } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import Alerts from '../../../../../../services/alerts.js'
import Dialog from '../../../../../../services/dialog.js'

import CreateTable from './CreateTable.vue'
export default defineComponent({
    name: 'TablesList',
    components: { SearchIcon, TableIcon },
    emits: ['select-table'],
    data () {
        return {
            filterTerm: '',
            tables: []
        }
    },
    computed: {
        ...mapGetters('product/tables', { getTables: 'tables' }),
        ...mapState('product/tables', { tablesState: 'tables' }),
        filteredTables () {
            return this.tables.filter(t => t.name.toLowerCase().includes(this.filterTerm.toLowerCase()))
        }
    },
    watch: {
        tablesState: {
            deep: true,
            handler (newVal) {
                this.tables = this.getTables(this.$route.params.id)
            }
        }
    },
    methods: {
        ...mapActions('product/tables', ['updateTableSelection']),
        onCreateTable () {
            Dialog.show({
                header: 'Create a new Table',
                kind: 'primary',
                confirmLabel: 'Create',
                is: {
                    component: CreateTable
                }
            }, async () => {
                Alerts.emit('Table created successfully.', 'confirmation')
            })
        }
    }
})
</script>

<style scoped lang="scss">
#tables-list {
    display: flex;
    flex-direction: column;
    max-width: 20%;
    min-width: 250px;

    .header {
        border-bottom: 1px solid $ff-color--border;
        padding-bottom: 15px;
        margin-bottom: 15px;
    }

    .list {
        .item {
            display: flex;
            gap: 5px;
            line-height: 2;
            align-items: center;
            transition: ease-in-out .3s;
            cursor: pointer;

            &:hover {
             color: $ff-indigo-500;
                background-color: $ff-grey-100;
            }
        }
    }

    .empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        text-align: center;
        justify-content: center;
        color: $ff-grey-400;
        line-height: 1.6;

        .cta {
            cursor: pointer;
            color: $ff-indigo-500;
        }
    }
}
</style>
