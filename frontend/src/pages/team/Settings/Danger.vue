<template>
    <div class="space-y-6">
        <FormHeading class="text-red-700">Delete Team</FormHeading>
        <div>
            <div class="max-w-sm pr-2">{{deleteDescription}}</div>
            <div class="mt-2">
                <ff-button kind="danger" :disabled="!deleteActive" @click="showConfirmDeleteDialog()">Delete Team</ff-button>
                <ConfirmTeamDeleteDialog @deleteTeam="deleteTeam" ref="confirmTeamDeleteDialog"/>
            </div>
        </div>
    </div>
</template>

<script>
import teamApi from '@/api/team'

import FormHeading from '@/components/FormHeading'
import ConfirmTeamDeleteDialog from '../dialogs/ConfirmTeamDeleteDialog'

export default {
    name: 'TeamSettingsDanger',
    props: ['team'],
    data () {
        return {
            projectCount: -1
        }
    },
    computed: {
        deleteActive () {
            return this.projectCount === 0
        },
        deleteDescription () {
            if (this.projectCount > 0) {
                return 'You cannot delete a team that still owns projects.'
            } else {
                return 'Deleting the team cannot be undone. Take care.'
            }
        }
    },
    watch: {
        team: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        showConfirmDeleteDialog () {
            this.$refs.confirmTeamDeleteDialog.show(this.team)
        },
        deleteTeam () {
            teamApi.deleteTeam(this.team.id).then(() => {
                this.$store.dispatch('account/checkState', '/')
            }).catch(err => {
                console.warn(err)
            })
        },
        async fetchData () {
            if (this.team.id) {
                const data = await teamApi.getTeamProjects(this.team.id)
                this.projectCount = data.count
            }
        }
    },
    components: {
        FormHeading,
        ConfirmTeamDeleteDialog
    }
}
</script>
