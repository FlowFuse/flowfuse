<template>
    <form class="space-y-6">

        <!-- <FormHeading class="text-red-700">Transfer Project</FormHeading>
        <div class="flex">
            <div class="max-w-sm pr-2">Transfer this project to another team. You must be a member of the destination team</div>
            <div class="pl-2">
                <button type="button" class="forge-button-danger">Transfer Project</button>
            </div>
        </div> -->

        <FormHeading class="text-red-700">Delete Project</FormHeading>
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
import ConfirmProjectDeleteDialog from './dialogs/ConfirmProjectDeleteDialog'


export default {
    name: 'ProjectSettingsDanger',

    props:[ "project" ],
    methods: {
        showConfirmDeleteDialog() {
            this.$refs.confirmProjectDeleteDialog.show(this.project);
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
