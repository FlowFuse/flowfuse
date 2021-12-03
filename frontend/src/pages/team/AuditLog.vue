<template>
    <AuditLog :entity="verifiedTeam" :loadItems="loadItems" />
</template>

<script>
import teamApi from '@/api/team'
import AuditLog from '@/components/AuditLog'
import { useRoute, useRouter } from 'vue-router';
import { Roles } from '@/utils/roles'

export default {
    name: 'TeamAuditLog',
    props:[ "team", "teamMembership" ],
    watch: {
         team: 'fetchData',
         teamMembership: 'fetchData'
    },
    data() {
        return {
            verifiedTeam: null,
        }
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        loadItems: async function(projectId,cursor) {
            return await teamApi.getTeamAuditLog(projectId,cursor);
        },
        fetchData: async function(newVal) {
            if (this.team.id && this.teamMembership && this.teamMembership.role === Roles.Owner) {
                this.verifiedTeam = this.team;
            } else if (this.teamMembership && this.teamMembership.role !== Roles.Owner) {
                useRouter().push({ path: `/team/${useRoute().params.id}/overview` })
            }
        }
    },
    components: {
        AuditLog
    }
}
</script>
