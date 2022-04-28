<template>
    <SectionTopMenu hero="Audit Log" />
    <AuditLog :entity="verifiedTeam" :loadItems="loadItems" />
</template>

<script>
import teamApi from '@/api/team'
import SectionTopMenu from '@/components/SectionTopMenu'
import AuditLog from '@/components/AuditLog'
import { Roles } from '@core/lib/roles'

export default {
    name: 'TeamAuditLog',
    props: ['team', 'teamMembership'],
    watch: {
        team: 'fetchData',
        teamMembership: 'fetchData'
    },
    data () {
        return {
            verifiedTeam: null
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        loadItems: async function (projectId, cursor) {
            return await teamApi.getTeamAuditLog(projectId, cursor)
        },
        fetchData: async function (newVal) {
            if (this.team.id && this.teamMembership && this.teamMembership.role === Roles.Owner) {
                this.verifiedTeam = this.team
            } else if (this.teamMembership && this.teamMembership.role !== Roles.Owner) {
                this.$router.push({ path: `/team/${this.team.slug}/overview` })
            }
        }
    },
    components: {
        AuditLog,
        SectionTopMenu
    }
}
</script>
