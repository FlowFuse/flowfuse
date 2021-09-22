<template>
    <form class="space-y-6">
        <FormHeading>Team Settings</FormHeading>
        <FormRow v-model="input.teamName" id="teamName">Name</FormRow>

        <FormHeading class="text-red-700 pt-10">Delete Team</FormHeading>
        <div class="flex">
            <div class="max-w-sm pr-2">{{deleteDescription}}</div>
            <div class="pl-2">
                <button type="button" :disabled="!deleteActive" class="forge-button-danger" @click="showConfigDeleteDialog" >Delete Team</button>
            </div>
        </div>
    </form>
</template>

<script>
import teamApi from '@/api/team'

import { mapState } from 'vuex'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'TeamSettings',
    mixins: [Breadcrumbs],
    props:[ "team" ],
    data() {
        return {
            input: {
                teamName: ""
            },
            deleteDescription: "",
            projectCount: -1
        }
    },
    created() {
        this.replaceLastBreadcrumb({ label:"Settings" })
    },
    computed: {
        deleteActive() {
            if (this.projectCount > 0) {
                this.deleteDescription = "You cannot delete a team that still owns projects. You must either transfer them to other teams or delete the projects."
                return false
            } else {
                this.deleteDescription = "Deleting the team cannot be undone. Take care.";
                return true
            }
        }
    },
    watch: {
         team: 'fetchData'
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        async fetchData () {
            this.input.teamName = this.team.name;
            if (this.team.name) {
                const data = await teamApi.getTeamProjects(this.team.name);
                this.projectCount = data.count;
            }
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
