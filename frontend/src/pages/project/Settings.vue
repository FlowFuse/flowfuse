<template>
    <form class="space-y-6">
        <FormHeading>Project Settings</FormHeading>
        <FormRow v-model="input.projectName" id="projectName">Name</FormRow>

        <FormHeading class="text-red-700 pt-10">Delete Project</FormHeading>
        <div class="flex">
            <div class="max-w-sm pr-2">Once deleted, your project is gone. This cannot be undone.</div>
            <div class="pl-2">
                <button type="button" class="forge-button-danger" @click="showConfigDeleteDialog" >Delete Project</button>
                <ConfirmProjectDeleteDialog @deleteProject="deleteProject" ref="confirmProjectDeleteDialog"/>
            </div>
        </div>
    </form>
</template>

<script>
import projectApi from '@/api/project'

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import ConfirmProjectDeleteDialog from '@/components/dialogs/ConfirmProjectDeleteDialog'
import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'ProjectSettings',
    mixins: [Breadcrumbs],
    props:[ "project" ],
    data() {
        return {
            input: {
                projectName: ""
            },
            createDialogOpen: false
        }
    },
    created() {
        this.replaceLastBreadcrumb({ label:"Settings" })
    },
    watch: {
         team: 'fetchData'
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        showConfigDeleteDialog() {
            this.$refs.confirmProjectDeleteDialog.show(this.project);
        },
        fetchData () {
            this.input.projectName = this.project.name;
        },
        deleteProject() {
            projectApi.deleteProject(this.project.id).then(() => {
                this.$router.push( { name: 'Home' });
            }).catch(err => {
                console.warn(err);
            })
        }
    },
    components: {
        FormRow,
        FormHeading,
        ConfirmProjectDeleteDialog
    }
}
</script>
