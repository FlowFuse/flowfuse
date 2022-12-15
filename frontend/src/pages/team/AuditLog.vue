<template>
    <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in this Team." />
    <AuditLog :entity="verifiedTeam" :entries="entries" />
</template>

<script>
import teamApi from '@/api/team'
import SectionTopMenu from '@/components/SectionTopMenu'
import AuditLog from '@/components/audit-log/AuditLog'
import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'TeamAuditLog',
    props: ['team', 'teamMembership'],
    mixins: [permissionsMixin],
    watch: {
        team: 'fetchData',
        teamMembership: 'fetchData'
    },
    data () {
        return {
            verifiedTeam: null,
            entries: null
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        loadItems: async function (projectId, cursor) {
            return await teamApi.getTeamAuditLog(projectId, cursor, 200)
        },
        fetchData: async function (newVal) {
            if (this.hasPermission('team:audit-log')) {
                this.verifiedTeam = this.team
                const result = await this.loadItems(this.verifiedTeam.id)
                this.entries = result.log
            } else {
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
