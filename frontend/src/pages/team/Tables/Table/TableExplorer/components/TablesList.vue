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

            <ff-button kind="secondary" @click="onCreateTable">
                <template #icon>
                    <PlusIcon />
                </template>
            </ff-button>
        </div>

        <ul v-if="databaseTables.length" class="list">
            <li>hello there!</li>
        </ul>

        <div v-else class="empty-state">
            <p>Ready to organize your data?</p>
            <p><span class="cta" @click="onCreateTable">Create</span> your first table now.</p>
        </div>
    </section>
</template>

<script>
import { PlusIcon, SearchIcon } from '@heroicons/vue/outline'
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

import Alerts from '../../../../../../services/alerts.js'
import Dialog from '../../../../../../services/dialog.js'

import FfButton from '../../../../../../ui-components/components/Button.vue'

import CreateTable from './CreateTable.vue'
export default defineComponent({
    name: 'TablesList',
    components: { FfButton, SearchIcon, PlusIcon },
    data () {
        return {
            filterTerm: ''
        }
    },
    computed: {
        ...mapGetters('product/tables', ['tables']),
        databaseTables () {
            return this.tables(this.$route.params.id)
        }
    },
    methods: {
        onCreateTable () {
            Dialog.show({
                header: 'Create a new Table',
                kind: 'primary',
                confirmLabel: 'Create',
                is: {
                    component: CreateTable
                }
            }, async () => {
                Alerts.emit('way to goo!', 'confirmation')
            })
        }
    }
})
</script>

<style scoped lang="scss">
#tables-list {
    display: flex;
    flex-direction: column;

    .header {
        border-bottom: 1px solid $ff-color--border;
        padding-bottom: 15px;
        margin-bottom: 15px;
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
