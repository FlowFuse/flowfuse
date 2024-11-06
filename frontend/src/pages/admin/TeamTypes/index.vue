<template>
    <!-- set mb-14 (~56px) on the form to permit access to kebab actions where hubspot chat covers it -->
    <div class="space-y-6 mb-14">
        <SectionTopMenu hero="Team Types">
            <template #tools>
                <ff-button data-action="create-type" @click="showEditTeamTypeDialog()">
                    <template #icon-right>
                        <PlusSmIcon />
                    </template>
                    Create team type
                </ff-button>
            </template>
        </SectionTopMenu>
        <ff-tile-selection data-el="active-types">
            <ff-tile-selection-option
                v-for="(teamType, index) in activeTeamTypes"
                :key="index"
                value=""
                :price="teamType.properties?.billingDescription?.split('/')[0] || ''"
                :price-interval="teamType.properties?.billingDescription?.split('/')[1] || ''"
                :label="teamType.name" :description="teamType.description"
                :meta="[{key: 'ID', value: teamType.id}, {key: 'Team Count', value: teamType.teamCount}]"
                :editable="true"
                @edit="showEditTeamTypeDialog(teamType)"
            />
        </ff-tile-selection>
        <div v-if="nextCursor">
            <a v-if="!loading" class="forge-button-inline" @click.stop="loadItems">Load more...</a>
        </div>
        <SectionTopMenu hero="Inactive Types" />
        <ff-data-table :columns="columns" :rows="inactiveTeamTypes" data-el="inactive-types">
            <template #context-menu="{row}">
                <ff-list-item label="Edit Team Type" @click="teamTypeAction('edit', row.id)" />
                <ff-list-item label="Delete Team Type" kind="danger" @click="teamTypeAction('delete', row.id)" />
            </template>
        </ff-data-table>
        <div v-if="nextCursor">
            <a v-if="!loading" class="forge-button-inline" @click.stop="loadItems">Load more...</a>
        </div>
    </div>
    <TeamTypeEditDialog
        ref="adminTeamTypeEditDialog"
        @team-type-created="teamTypeCreated"
        @team-type-updated="teamTypeUpdated"
        @show-delete-dialog="showConfirmTeamTypeDeleteDialog"
    />
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'

import teamTypesApi from '../../../api/teamTypes.js'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'

import Dialog from '../../../services/dialog.js'

import TeamTypeEditDialog from './dialogs/TeamTypeEditDialog.vue'

const marked = require('marked')

export default {
    name: 'AdminTeamTypes',
    components: {
        SectionTopMenu,
        PlusSmIcon,
        TeamTypeEditDialog
    },
    data () {
        return {
            teamTypes: [],
            loading: false,
            nextCursor: null,
            columns: [
                { label: 'ID', key: 'id', sortable: true, class: ['w-32'] },
                { label: 'Type', key: 'name', sortable: true },
                { label: 'Team Count', class: ['w-32', 'text-center'], key: 'teamCount', sortable: true }
            ]
        }
    },
    computed: {
        activeTeamTypes () {
            const types = this.teamTypes.filter(pt => pt.active)
            return types
        },
        inactiveTeamTypes () {
            const types = this.teamTypes.filter(pt => !pt.active)
            return types
        }
    },
    async created () {
        await this.loadItems()
    },
    methods: {
        teamTypeAction (action, id) {
            const index = this.teamTypes.findIndex(pt => pt.id === id)
            const teamType = this.teamTypes[index]

            switch (action) {
            case 'edit':
                this.showEditTeamTypeDialog(teamType)
                break
            case 'delete': {
                this.showConfirmTeamTypeDeleteDialog(teamType)
                break
            }
            }
        },
        showCreateTeamTypeDialog () {
            this.$refs.adminTeamTypeEditDialog.show()
        },
        showEditTeamTypeDialog (teamType) {
            this.$refs.adminTeamTypeEditDialog.show(teamType)
        },
        showConfirmTeamTypeDeleteDialog (teamType) {
            const text = teamType.teamCount > 0 ? 'You cannot delete a team type that is still being used.' : 'Are you sure you want to delete this team type?'
            Dialog.show({
                header: 'Delete Team Type',
                kind: 'danger',
                text,
                confirmLabel: 'Delete',
                disablePrimary: teamType.teamCount > 0
            }, async () => {
                // on confirm - delete the instance type
                await teamTypesApi.deleteTeamType(teamType.id)
                const index = this.teamTypes.findIndex(pt => pt.id === teamType.id)
                this.teamTypes.splice(index, 1)
            })
        },
        async teamTypeCreated (teamType) {
            this.teamTypes.push(teamType)
            this.resortTypes()
        },
        async teamTypeUpdated (teamType) {
            const index = this.teamTypes.findIndex(s => s.id === teamType.id)
            if (index > -1) {
                teamType.htmlDescription = marked.parse(teamType.description)
                this.teamTypes[index] = teamType
                this.resortTypes()
            }
        },
        resortTypes () {
            this.teamTypes.sort((A, B) => {
                if (A.order !== B.order) {
                    return A.order - B.order
                } else {
                    return A.name.localeCompare(B.name)
                }
            })
        },
        // async deleteStack (stack) {
        //     await stacksApi.deleteStack(stack.id)
        //     const index = this.stacks.indexOf(stack)
        //     this.stacks.splice(index, 1)
        // },
        loadItems: async function () {
            this.loading = true
            const result = await teamTypesApi.getTeamTypes(this.nextCursor, 30, 'all')
            this.nextCursor = result.meta.next_cursor
            result.types.forEach(v => {
                this.teamTypes.push(v)
            })
        }
    }
}
</script>
