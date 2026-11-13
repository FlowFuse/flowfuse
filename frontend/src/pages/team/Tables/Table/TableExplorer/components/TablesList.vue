<template>
    <section id="tables-list" data-el="tables-list">
        <div class="header flex gap-2">
            <ff-text-input
                v-model="filterTerm"
                class="ff-data-table--search"
                data-form="search"
                placeholder="Search Tables"
            >
                <template #icon><MagnifyingGlassIcon /></template>
            </ff-text-input>
            <button class="ff-btn ff-btn--secondary transition-fade--color" type="button" @click.stop="onCreateTable">
                <span class="ff-btn--icon">
                    <PlusIcon />
                </span>
            </button>
        </div>

        <div v-if="filteredTables.length && tables.length" class="list">
            <FfAccordion
                v-for="group in tableGroups" :key="group.schema"
                class="schema-group" variant="bare" set-open
                :data-schema="group.schema"
            >
                <template #label>
                    <span class="schema-name truncate" :title="group.schema">{{ group.schema }}</span>
                </template>
                <template #content>
                    <ul>
                        <li
                            v-for="table in group.tables" :key="table.name"
                            :title="table.name"
                            class="item relative"
                            :class="{active: table.name === tableSelection?.name && table.dbSchema === tableSelection?.dbSchema}"
                            @click="updateTableSelection({ name: table.name, dbSchema: table.dbSchema })"
                        >
                            <span class="icon-toggle">
                                <TableCellsIcon class="ff-icon ff-icon-sm" />
                                <PencilSquareIcon class="ff-icon ff-icon-sm edit" @click="showSchema(table)" />
                            </span>
                            <span class="truncate">{{ table.name }}</span>
                        </li>
                    </ul>
                </template>
            </FfAccordion>
        </div>

        <div v-else-if="!filteredTables.length && tables.length" class="empty-state">
            <p>No tables found matching your criteria!</p>
        </div>

        <div v-else class="empty-state flex gap-5">
            <p>Get started by creating your first table using the <code>@flowfuse/nr-tables-nodes</code> node in a Node-RED Instance.</p>
            <p>or <span class="cta" @click="onCreateTable">create</span> your first table now.</p>
        </div>
    </section>
</template>

<script>
import { MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, TableCellsIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'
import { defineComponent, markRaw } from 'vue'

import CreateTable from '../drawers/CreateTable.vue'
import TableSchema from '../drawers/TableSchema.vue'

import FfAccordion from '@/components/Accordion.vue'
import { useProductTablesStore } from '@/stores/product-tables.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

export default defineComponent({
    name: 'TablesList',
    components: { FfAccordion, MagnifyingGlassIcon, TableCellsIcon, PlusIcon, PencilSquareIcon },
    emits: ['select-table'],
    data () {
        return {
            filterTerm: '',
            tables: []
        }
    },
    computed: {
        ...mapState(useUxDrawersStore, ['rightDrawer']),
        ...mapState(useProductTablesStore, { tablesState: 'tables', tableSelection: 'tableSelection' }),
        filteredTables () {
            return this.tables.filter(t => (t.name ?? '').toLowerCase().includes(this.filterTerm.toLowerCase()))
        },
        // the store hands the tables over already ordered by schema, so the groups come out in that order
        tableGroups () {
            const groups = new Map()
            this.filteredTables.forEach(table => {
                if (!groups.has(table.dbSchema)) groups.set(table.dbSchema, [])
                groups.get(table.dbSchema).push(table)
            })
            return [...groups].map(([schema, tables]) => ({ schema, tables }))
        }
    },
    watch: {
        tablesState: {
            deep: true,
            handler () {
                this.tables = this.tablesState[this.$route.params.id] ?? []
            }
        }
    },
    methods: {
        ...mapActions(useUxDrawersStore, ['openRightDrawer', 'closeRightDrawer']),
        ...mapActions(useProductTablesStore, ['updateTableSelection']),

        onCreateTable () {
            this.openRightDrawer({
                component: markRaw(CreateTable),
                wider: true,
                overlay: true
            })
        },
        showSchema (table) {
            this.openRightDrawer({
                component: markRaw(TableSchema),
                props: { table },
                overlay: true
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
        border-bottom: 1px solid var(--ff-color-border);
        padding-bottom: 15px;
        margin-bottom: 15px;

        .ff-data-table--search {
            min-width: 10px;
        }
    }

    .list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;

        .schema-group {
            margin-bottom: 10px;

            :deep(.ff-accordion--button) {
                margin: 0;
                padding: 2px 12px;
            }

            :deep(.ff-accordion--content) {
                margin-top: 0;
            }

            .schema-name {
                font-size: 0.75rem;
            }
        }

        .item {
            display: flex;
            gap: 5px;
            padding: 0 12px;
            line-height: 2;
            align-items: center;
            transition: ease-in-out .3s;
            cursor: pointer;

            &:hover, &.active {
                color: var(--ff-color-focus);
                background-color: var(--ff-color-bg-surface-raised);
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
                        transform: scale(1.4);
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
        color: var(--ff-color-text-subtle);
        line-height: 1.6;

        .cta {
            cursor: pointer;
            color: var(--ff-color-focus);
        }
    }
}
</style>
