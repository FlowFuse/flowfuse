<template>
    <form class="space-y-6">
        <FormHeading>Project Settings</FormHeading>
        <FormRow v-model="input.projectName" id="projectName">Name</FormRow>

        <!-- <FormHeading class="text-red-700 pt-10">Transfer Project</FormHeading>
        <div class="flex">
            <div class="max-w-sm pr-2">Transfer this project to another team. You must be a member of the destination team</div>
            <div class="pl-2">
                <button type="button" class="forge-button-danger">Transfer Project</button>
                <ConfirmProjectDeleteDialog @deleteProject="deleteProject" ref="confirmProjectDeleteDialog2"/>
            </div>
        </div> -->

        <FormHeading class="text-red-700 pt-10">Delete Project</FormHeading>
        <div class="flex">
            <div class="max-w-sm pr-2">Once deleted, your project is gone. This cannot be undone.</div>
            <div class="pl-2">
                <button type="button" class="forge-button-danger" @click="showConfirmDeleteDialog" >Delete Project</button>
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


export default {
    name: 'ProjectSettings',

    props:[ "project" ],
    data() {
        return {
            input: {
                projectName: ""
            },
            createDialogOpen: false
        }
    },
    watch: {
         project: 'fetchData'
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        showConfirmDeleteDialog() {
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
