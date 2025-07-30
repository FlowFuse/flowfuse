<template>
    <section id="tables-list" data-el="tables-list">
        <div class="header flex gap-2">
            <ff-text-input
                v-model="filterTerm"
                class="ff-data-table--search"
                data-form="search"
                placeholder="Search Tables"
            >
                <template #icon><SearchIcon /></template>
            </ff-text-input>
            <button class="ff-btn ff-btn--secondary transition-fade--color" type="button" @click.stop="onCreateTable">
                <span class="ff-btn--icon">
                    <PlusIcon />
                </span>
            </button>
        </div>

        <ul v-if="filteredTables.length && tables.length" class="list">
            <li
                v-for="table in filteredTables" :key="table.id"
                :title="table.name"
                class="item relative"
                :class="{active: table.name === tableSelection}"
                @click="updateTableSelection(table.name)"
            >
                <span class="icon-toggle">
                    <TableIcon class="ff-icon ff-icon-sm" />
                    <PencilAltIcon class="ff-icon ff-icon-sm edit" @click="showSchema(table)" />
                </span>
                <span class="truncate">{{ table.name }}</span>
            </li>
        </ul>

        <div v-else-if="!filteredTables.length && tables.length" class="empty-state">
            <p>No tables found matching your criteria!</p>
        </div>

        <div v-else class="empty-state flex gap-5">
            <p>Get Started by creating your first table using the <code>contrib-postgres</code> node in a Node-RED Instance.</p>
            <p>Or <span class="cta" @click="onCreateTable">Create</span> your first table now.</p>
        </div>
    </section>
</template>

<script>
import { PencilAltIcon, PlusIcon, SearchIcon, TableIcon } from '@heroicons/vue/outline'
import { defineComponent, markRaw } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import CreateTable from '../drawers/CreateTable.vue'
import TableSchema from '../drawers/TableSchema.vue'

export default defineComponent({
    name: 'TablesList',
    components: { SearchIcon, TableIcon, PlusIcon, PencilAltIcon },
    emits: ['select-table'],
    data () {
        return {
            filterTerm: '',
            tables: []
        }
    },
    computed: {
        ...mapGetters('product/tables', { getTables: 'tables' }),
        ...mapState('product/tables', { tablesState: 'tables', tableSelection: 'tableSelection' }),
        ...mapState('ux', ['rightDrawer']),
        filteredTables () {
            return this.tables.filter(t => (t.name ?? '').toLowerCase().includes(this.filterTerm.toLowerCase()))
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
        ...mapActions('ux', ['openRightDrawer', 'closeRightDrawer']),

        onCreateTable () {
            this.openRightDrawer({ component: markRaw(CreateTable), wider: true })
        },
        showSchema (table) {
            this.openRightDrawer({ component: markRaw(TableSchema), props: { table } })
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

        .ff-data-table--search {
            min-width: 10px;
        }
    }

    .list {
        .item {
            display: flex;
            gap: 5px;
            line-height: 2;
            align-items: center;
            transition: ease-in-out .3s;
            cursor: pointer;

            &:hover, &.active {
                color: $ff-indigo-500;
                background-color: $ff-grey-100;
            }

            &:hover {
                .icon-toggle {
                    .ff-icon:first-child {
                        display: none;
                    }
                    .ff-icon:last-child {
                        display: inline-block;
                    }
                }
            }

            .icon-toggle {
                width: 24px;
                .ff-icon:first-child {
                    display: inline-block;
                }
                .ff-icon:last-child {
                    display: none;
                }

                .edit {
                    &:hover {
                        transform: scale(1.2);
                    }
                }
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
