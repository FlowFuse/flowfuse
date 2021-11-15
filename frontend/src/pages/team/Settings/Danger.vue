<template>
    <form class="space-y-6">
        <FormHeading class="text-red-700">Delete Team</FormHeading>
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

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

export default {
    name: 'TeamSettingsDanger',
    props:[ "team" ],
    data() {
        return {
            deleteDescription: "",
            projectCount: -1
        }
    },
    computed: {
        deleteActive() {
            if (this.projectCount > 0) {
                this.deleteDescription = "You cannot delete a team that still owns projects. You must either transfer them to other teams or delete the projects."
                return false
            } else if (this.projectCount === 0){
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
            if (this.team.id) {
                const data = await teamApi.getTeamProjects(this.team.id);
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
