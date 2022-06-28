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
        <ItemTable :items="inactiveProjectTypes" :columns="columns" @projectTypeAction="projectTypeAction"/>
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
    </form>
    <ProjectTypeEditDialog @projectTypeCreated="projectTypeCreated" @projectTypeUpdated="projectTypeUpdated" ref="adminProjectTypeEditDialog"/>
</template>

<script>
import projectTypesApi from '@/api/projectTypes'
import ItemTable from '@/components/tables/ItemTable'
import FormHeading from '@/components/FormHeading'
import { markRaw } from 'vue'
import { mapState } from 'vuex'
import ProjectTypeEditButton from './components/ProjectTypeEditButton'
import ProjectTypeEditDialog from './dialogs/ProjectTypeEditDialog'
import ProjectTypeDescriptionCell from './components/ProjectTypeDescriptionCell'
import ProjectTypeSummary from '../../team/components/ProjectTypeSummary'
import { PlusSmIcon } from '@heroicons/vue/outline'

const marked = require('marked')

const WrappedProjectTypeEditButton = {
    template: '<ProjectTypeEditButton :id="id" @projectTypeAction="projectTypeAction"></ProjectTypeEditButton>',
    props: ['id'],
    methods: {
        projectTypeAction (action, id) {
            this.$parent.$emit('projectTypeAction', action, id)
        }
    },
    components: { ProjectTypeEditButton }
}

export default {
    name: 'AdminProjectTypes',
    data () {
        return {
            projectTypes: [],
            loading: false,
            nextCursor: null,
            columns: [
                { name: 'Type', property: 'name' },
                { name: 'Description', component: { is: markRaw(ProjectTypeDescriptionCell) } },
                { name: 'Default Stack', class: ['w-16'], property: 'defaultStack' },
                { name: 'Projects', class: ['w-16', 'text-center'], property: 'projectCount' },
                { name: 'Stacks', class: ['w-16', 'text-center'], property: 'stackCount' },
                { name: '', class: ['w-16', 'text-center'], component: { is: markRaw(WrappedProjectTypeEditButton) } }
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
                // this.showEditProjectTypeDialog(projectType)
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
            // this.$refs.adminStackDeleteDialog.show(stack)
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
        ItemTable,
        PlusSmIcon,
        ProjectTypeEditDialog,
        ProjectTypeSummary,
        ProjectTypeEditButton
    }
}
</script>
