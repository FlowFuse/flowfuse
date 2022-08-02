<template>
    <form class="space-y-6">
        <FormHeading>Project Types
            <template v-slot:tools>
                <ff-button size="small" @click="showCreateProjectTypeDialog">
                    <template v-slot:icon-right>
                        <PlusSmIcon />
                    </template>
                    Create project type
                </ff-button>
            </template>
        </FormHeading>
        <ul class="flex flex-wrap gap-1 items-stretch">
            <li v-for="(projType, index) in activeProjectTypes" :key="index">
                <ProjectTypeSummary :projectType="projType">
                    <template v-slot:footer>
                        <hr class="border border-gray-300 mb-1" />
                        <table class="text-sm">
                            <tr><td>Stack Count</td><td class="flex flex-row">{{projType.stackCount}}</td></tr>
                            <tr><td>Project Count</td><td>{{projType.projectCount}}</td></tr>
                        </table>
                        <div class="text-right mt-2">
                            <ProjectTypeEditButton :id="projType.id" @projectTypeAction="projectTypeAction"></ProjectTypeEditButton>
                        </div>
                    </template>
                </ProjectTypeSummary>
            </li>
            <li>
                <div class="flex flex-col border-2 border-gray-300 border-dashed bg-gray-100 p-3 w-52 h-full" style="min-height: 250px">
                    <div class="flex justify-center items-center h-full">
                        <ff-button kind="secondary" @click="showCreateProjectTypeDialog">
                            <template v-slot:icon>
                                <PlusSmIcon />
                            </template>
                        </ff-button>
                    </div>
                </div>
            </li>
        </ul>

        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
        <FormHeading>Inactive Types</FormHeading>
        <ff-data-table :columns="columns" :rows="inactiveProjectTypes">
            <template v-slot:context-menu="{row}">
                <ff-list-item label="Edit Project Type" @click="projectTypeAction('edit', row.id)"/>
                <ff-list-item label="Delete Project Type" kind="danger" @click="projectTypeAction('delete', row.id)"/>
            </template>
        </ff-data-table>
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
    </form>
    <ProjectTypeEditDialog @projectTypeCreated="projectTypeCreated" @projectTypeUpdated="projectTypeUpdated" ref="adminProjectTypeEditDialog"/>
    <ProjectTypeDeleteDialog @deleteProjectType="deleteProjectType" ref="adminProjectTypeDeleteDialog" />
</template>

<script>
import projectTypesApi from '@/api/projectTypes'
import FormHeading from '@/components/FormHeading'
import { markRaw } from 'vue'
import { mapState } from 'vuex'
import ProjectTypeEditButton from './components/ProjectTypeEditButton'
import ProjectTypeEditDialog from './dialogs/ProjectTypeEditDialog'
import ProjectTypeDeleteDialog from './dialogs/ProjectTypeDeleteDialog'
import ProjectTypeDescriptionCell from './components/ProjectTypeDescriptionCell'
import ProjectTypeSummary from '../../team/components/ProjectTypeSummary'
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
            case 'delete':
                this.showConfirmProjectTypeDeleteDialog(projectType)
                break
            }
        },
        showCreateProjectTypeDialog () {
            this.$refs.adminProjectTypeEditDialog.show()
        },
        showEditProjectTypeDialog (projectType) {
            this.$refs.adminProjectTypeEditDialog.show(projectType)
        },
        showConfirmProjectTypeDeleteDialog (projectType) {
            this.$refs.adminProjectTypeDeleteDialog.show(projectType)
        },
        async deleteProjectType (projectType) {
            await projectTypesApi.deleteProjectType(projectType.id)
            const index = this.projectTypes.findIndex(pt => pt.id === projectType.id)
            this.projectTypes.splice(index, 1)
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
        ProjectTypeEditDialog,
        ProjectTypeDeleteDialog,
        ProjectTypeSummary,
        ProjectTypeEditButton
    }
}
</script>
