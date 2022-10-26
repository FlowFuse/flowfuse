<template>
    <div class="space-y-6">
        <FormHeading>Project Types
            <template v-slot:tools>
                <ff-button size="small" @click="showCreateProjectTypeDialog" data-action="create-type">
                    <template v-slot:icon-right>
                        <PlusSmIcon />
                    </template>
                    Create project type
                </ff-button>
            </template>
        </FormHeading>
        <ff-tile-selection data-el="active-types">
            <ff-tile-selection-option v-for="(projType, index) in activeProjectTypes" :key="index"
                                      :editable="true" @edit="showEditProjectTypeDialog(projType)" :price="projType.properties?.billingDescription?.split('/')[0]"
                                      :price-interval="projType.properties?.billingDescription?.split('/')[1]"
                                      :label="projType.name" :description="projType.description"
                                      :meta="[{key: 'Project Count', value: projType.projectCount}, {key: 'Stack Count', value: projType.stackCount}]"/>
        </ff-tile-selection>
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
        <FormHeading>Inactive Types</FormHeading>
        <ff-data-table :columns="columns" :rows="inactiveProjectTypes" data-el="inactive-types">
            <template v-slot:context-menu="{row}">
                <ff-list-item label="Edit Project Type" @click="projectTypeAction('edit', row.id)"/>
                <ff-list-item label="Delete Project Type" kind="danger" @click="projectTypeAction('delete', row.id)"/>
            </template>
        </ff-data-table>
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
    </div>
    <ProjectTypeEditDialog ref="adminProjectTypeEditDialog" @projectTypeCreated="projectTypeCreated"
                           @projectTypeUpdated="projectTypeUpdated" @showDeleteDialog="showConfirmProjectTypeDeleteDialog"/>
</template>

<script>
import projectTypesApi from '@/api/projectTypes'
import FormHeading from '@/components/FormHeading'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import Dialog from '@/services/dialog'

import ProjectTypeEditDialog from './dialogs/ProjectTypeEditDialog'
import ProjectTypeDescriptionCell from './components/ProjectTypeDescriptionCell'
import { PlusSmIcon } from '@heroicons/vue/outline'

const marked = require('marked')

export default {
    name: 'AdminProjectTypes',
    data () {
        return {
            projectTypes: [],
            loading: false,
            nextCursor: null,
            columns: [
                { label: 'Type', key: 'name', sortable: true },
                { label: 'Description', key: 'description', sortable: true, component: { is: markRaw(ProjectTypeDescriptionCell) } },
                { label: 'Default Stack', class: ['w-48'], key: 'defaultStack', sortable: true },
                { label: 'Projects', class: ['w-32', 'text-center'], key: 'projectCount', sortable: true },
                { label: 'Stacks', class: ['w-32', 'text-center'], key: 'stackCount', sortable: true }
            ]
        }
    },
    async created () {
        await this.loadItems()
    },
    computed: {
        ...mapState('account', ['settings']),
        activeProjectTypes () {
            const types = this.projectTypes.filter(pt => pt.active)
            return types
        },
        inactiveProjectTypes () {
            const types = this.projectTypes.filter(pt => !pt.active)
            return types
        }
    },
    methods: {
        projectTypeAction (action, id) {
            const index = this.projectTypes.findIndex(pt => pt.id === id)
            const projectType = this.projectTypes[index]

            switch (action) {
            case 'edit':
                this.showEditProjectTypeDialog(projectType)
                break
            case 'delete': {
                this.showConfirmProjectTypeDeleteDialog(projectType)
                break
            }
            }
        },
        showCreateProjectTypeDialog () {
            this.$refs.adminProjectTypeEditDialog.show()
        },
        showEditProjectTypeDialog (projectType) {
            this.$refs.adminProjectTypeEditDialog.show(projectType)
        },
        showConfirmProjectTypeDeleteDialog (projectType) {
            const text = projectType.projectCount > 0 ? 'You cannot delete a project type that is still being used by projects.' : 'Are you sure you want to delete this project type?'
            Dialog.show({
                header: 'Delete Project Type',
                kind: 'danger',
                text,
                confirmLabel: 'Delete',
                disablePrimary: projectType.projectCount > 0
            }, async () => {
                // on confirm - delete the project type
                await projectTypesApi.deleteProjectType(projectType.id)
                const index = this.projectTypes.findIndex(pt => pt.id === projectType.id)
                this.projectTypes.splice(index, 1)
            })
        },
        async projectTypeCreated (projectType) {
            this.projectTypes.push(projectType)
            this.resortTypes()
        },
        async projectTypeUpdated (projectType) {
            const index = this.projectTypes.findIndex(s => s.id === projectType.id)
            if (index > -1) {
                projectType.htmlDescription = marked.parse(projectType.description)
                this.projectTypes[index] = projectType
                this.resortTypes()
            }
        },
        resortTypes () {
            this.projectTypes.sort((A, B) => {
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
            const result = await projectTypesApi.getProjectTypes(this.nextCursor, 30, 'all')
            this.nextCursor = result.meta.next_cursor
            result.types.forEach(v => {
                this.projectTypes.push(v)
            })
        }
    },
    components: {
        FormHeading,
        PlusSmIcon,
        ProjectTypeEditDialog
    }
}
</script>
