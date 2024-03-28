<template>
    <div class="space-y-6">
        <SectionTopMenu hero="Flow Blueprints">
            <template #tools>
                <ff-button data-action="create-flow-blueprint" @click="showBlueprintForm()">
                    <template #icon-right>
                        <PlusSmIcon />
                    </template>
                    Create Flow Blueprint
                </ff-button>
            </template>
        </SectionTopMenu>
        <div data-el="blueprints" class="grid grid-cols-3 gap-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 max-w-screen-xl">
            <BlueprintTile
                v-for="(flowBlueprint, index) in activeFlowBlueprints"
                :key="index"
                :blueprint="flowBlueprint"
                :editable="true"
                @selected="showBlueprintForm(flowBlueprint)"
            />
        </div>
        <div v-if="nextCursor">
            <a v-if="!loading" class="forge-button-inline" @click.stop="loadItems">Load more...</a>
        </div>
        <SectionTopMenu hero="Inactive Blueprints" />
        <ff-data-table :columns="columns" :rows="inactiveFlowBlueprints" data-el="inactive-flow-blueprints">
            <template #context-menu="{row}">
                <ff-list-item label="Edit Flow Blueprint" @click="showBlueprintForm(row)" />
                <ff-list-item label="Delete Flow Blueprint" kind="danger" @click="showDeleteBlueprint(row)" />
            </template>
        </ff-data-table>
        <div v-if="nextCursor">
            <a v-if="!loading" class="forge-button-inline" @click.stop="loadItems">Load more...</a>
        </div>
    </div>
    <FlowBlueprintFormDialog
        ref="adminFlowBlueprintDialog"
        data-el="create-blueprint-dialog"
        @flow-blueprint-created="flowBlueprintCreated"
        @flow-blueprint-updated="flowBlueprintUpdated"
        @show-delete-dialog="showDeleteBlueprint"
    />
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import { mapState } from 'vuex'

import FlowBlueprintsApi from '../../../api/flowBlueprints.js'
import teamTypesApi from '../../../api/teamTypes.js'

import SectionTopMenu from '../../../components/SectionTopMenu.vue'

import MarkdownCell from '../../../components/tables/cells/MarkdownCell.vue'
import Dialog from '../../../services/dialog.js'

import BlueprintTile from '../../instance/Blueprints/BlueprintTile.vue'

import FlowBlueprintFormDialog from './dialogs/FlowBlueprintFormDialog.vue'

const marked = require('marked')

export default {
    name: 'AdminFlowBlueprints',
    components: {
        SectionTopMenu,
        PlusSmIcon,
        FlowBlueprintFormDialog,
        BlueprintTile
    },
    data () {
        return {
            flowBlueprints: new Map(),
            teamTypes: [],
            loading: false,
            nextCursor: null,
            columns: [
                { label: 'ID', key: 'id', sortable: true, class: ['w-32'] },
                { label: 'Name', key: 'name', sortable: true },
                { label: 'Description', key: 'description', sortable: true, component: { is: markRaw(MarkdownCell), map: { markdown: 'description' } } }
            ]
        }
    },
    computed: {
        ...mapState('account', ['features', 'settings']),
        flowBlueprintsArray () {
            return Array.from(this.flowBlueprints.values()).map((fb) => {
                fb.htmlDescription = marked.parse(fb.description)
                return fb
            })
        },
        activeFlowBlueprints () {
            return this.flowBlueprintsArray
                .filter(pt => pt.active)
                .sort((a, b) => {
                    return a.order - b.order
                })
        },
        inactiveFlowBlueprints () {
            return this.flowBlueprintsArray.filter(pt => !pt.active)
        }
    },
    async created () {
        if (this.features?.flowBlueprints) {
            await this.loadItems()
        } else {
            this.$router.push({ name: 'Admin Settings' })
        }
    },
    methods: {
        async showBlueprintForm (flowBlueprint) {
            if (flowBlueprint) {
                const fullFlowBlueprint = await FlowBlueprintsApi.getFlowBlueprint(flowBlueprint.id)
                return this.$refs.adminFlowBlueprintDialog.show(fullFlowBlueprint, this.teamTypes)
            }

            this.$refs.adminFlowBlueprintDialog.show(null, this.teamTypes)
        },
        showDeleteBlueprint (flowBlueprint) {
            Dialog.show({
                header: 'Delete Flow Blueprint',
                kind: 'danger',
                text: `Are you sure you want to delete the Flow Blueprint "${flowBlueprint.name}"?`,
                confirmLabel: 'Delete'
            }, async () => {
                await FlowBlueprintsApi.deleteFlowBlueprint(flowBlueprint.id)
                this.flowBlueprints.delete(flowBlueprint.id)
            })
        },
        async flowBlueprintCreated (flowBlueprint) {
            this.flowBlueprints.set(flowBlueprint.id, flowBlueprint)
        },
        async flowBlueprintUpdated (flowBlueprint) {
            this.flowBlueprints.set(flowBlueprint.id, flowBlueprint)
        },
        loadItems: async function () {
            this.loading = true
            const result = await FlowBlueprintsApi.getFlowBlueprints({ filter: 'all' }, this.nextCursor, 30)
            this.nextCursor = result.meta.next_cursor
            result.blueprints.forEach(flowBlueprint => {
                this.flowBlueprints.set(flowBlueprint.id, flowBlueprint)
            })
            const teamTypes = (await teamTypesApi.getTeamTypes()).types
            this.teamTypes = teamTypes.map(tt => {
                return {
                    order: tt.order,
                    id: tt.id,
                    name: tt.name
                }
            })
            this.teamTypes.sort((A, B) => { return A.order - B.order })
        }
    }
}
</script>
