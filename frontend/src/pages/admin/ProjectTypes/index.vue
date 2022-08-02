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
        <ff-tile-selection>
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
        <ItemTable :items="inactiveProjectTypes" :columns="columns" @projectTypeAction="projectTypeAction"/>
        <div v-if="nextCursor">
            <a v-if="!loading" @click.stop="loadItems" class="forge-button-inline">Load more...</a>
        </div>
    </form>
    <ProjectTypeEditDialog ref="adminProjectTypeEditDialog" @projectTypeCreated="projectTypeCreated"
                           @projectTypeUpdated="projectTypeUpdated" @showDeleteDialog="showConfirmProjectTypeDeleteDialog"/>
    <ProjectTypeDeleteDialog ref="adminProjectTypeDeleteDialog" @deleteProjectType="deleteProjectType" />
</template>

<script>
import projectTypesApi from '@/api/projectTypes'
import ItemTable from '@/components/tables/ItemTable'
import FormHeading from '@/components/FormHeading'
import { markRaw } from 'vue'
import { mapState } from 'vuex'
import ProjectTypeEditButton from './components/ProjectTypeEditButton'
import ProjectTypeEditDialog from './dialogs/ProjectTypeEditDialog'
import ProjectTypeDeleteDialog from './dialogs/ProjectTypeDeleteDialog'
import ProjectTypeDescriptionCell from './components/ProjectTypeDescriptionCell'
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
            console.log(projectType)
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
        ItemTable,
        PlusSmIcon,
        ProjectTypeEditDialog,
        ProjectTypeDeleteDialog
    }
}
</script>
