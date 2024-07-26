<template>
    <div class="space-y-6">
        <SectionTopMenu hero="Flow Blueprints">
            <template #tools>
                <div class="tools">
                    <ff-button data-action="export-flow-blueprints" @click="exportFlowBlueprints">
                        <template #icon-right>
                            <DownloadIcon class="ff-icon" />
                        </template>
                        Export
                    </ff-button>
                    <ff-button data-action="import-flow-blueprints" @click="showImportFlowBlueprintsDialog()">
                        <template #icon-right>
                            <UploadIcon class="ff-icon" />
                        </template>
                        Import
                    </ff-button>
                    <ff-button data-action="create-flow-blueprint" @click="showBlueprintForm()">
                        <template #icon-right>
                            <PlusSmIcon class="ff-icon" />
                        </template>
                        Create Flow Blueprint
                    </ff-button>
                </div>
            </template>
        </SectionTopMenu>
        <div data-el="blueprints" class="flex flex-wrap gap-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 max-w-screen-xl">
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
    <ImportFlowBlueprintsDialog ref="importFlowBlueprintsDialog" @import-blueprints="onImportFlowBlueprints" />
</template>

<script>
import { DownloadIcon, PlusSmIcon, UploadIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import { mapState } from 'vuex'

import FlowBlueprintsApi from '../../../api/flowBlueprints.js'
import teamTypesApi from '../../../api/teamTypes.js'

import SectionTopMenu from '../../../components/SectionTopMenu.vue'

import BlueprintTile from '../../../components/blueprints/BlueprintTile.vue'
import MarkdownCell from '../../../components/tables/cells/MarkdownCell.vue'
import { downloadData } from '../../../composables/Download.js'
import { dateToSlug } from '../../../composables/String.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

import FlowBlueprintFormDialog from './dialogs/FlowBlueprintFormDialog.vue'
import ImportFlowBlueprintsDialog from './dialogs/ImportFlowBlueprintsDialog.vue'

const marked = require('marked')

export default {
    name: 'AdminFlowBlueprints',
    components: {
        UploadIcon,
        ImportFlowBlueprintsDialog,
        SectionTopMenu,
        PlusSmIcon,
        DownloadIcon,
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
        showImportFlowBlueprintsDialog () {
            this.$refs.importFlowBlueprintsDialog.show()
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
            await this.setBlueprints(result.blueprints)
            await this.setTeamTypes()
        },
        async setBlueprints (blueprints) {
            blueprints.forEach(flowBlueprint => {
                this.flowBlueprints.set(flowBlueprint.id, flowBlueprint)
            })
        },
        async setTeamTypes () {
            const teamTypes = (await teamTypesApi.getTeamTypes()).types
            this.teamTypes = teamTypes.map(tt => {
                return {
                    order: tt.order,
                    id: tt.id,
                    name: tt.name
                }
            })
            this.teamTypes.sort((A, B) => { return A.order - B.order })
        },
        exportFlowBlueprints () {
            FlowBlueprintsApi.exportFlowBlueprints()
                .then((data) => {
                    const filename = `blueprints_export_${dateToSlug(new Date())}.json`
                    downloadData(data.blueprints, filename)
                })
                .catch(err => console.error(err.message))
        },
        onImportFlowBlueprints (blueprints) {
            FlowBlueprintsApi.importFlowBlueprints(blueprints)
                .then(response => this.setBlueprints(response.blueprints))
                .then(() => {
                    Alerts.emit('Blueprints successfully imported!', 'confirmation', 7500)
                })
                .catch(err => {
                    Alerts.emit('Something went wrong!', 'warning', 7500)
                    console.error(err.message)
                })
        }
    }
}
</script>

<style lang="scss" scoped>
.tools {
  display: flex;
  gap: 5px;
}
</style>
