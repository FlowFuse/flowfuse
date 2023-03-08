<template>
    <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" logType="team" @load-entries="loadEntries">
        <template #title>
            <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in this Team." />
        </template>
    </AuditLogBrowser>
</template>

<script>
import SectionTopMenu from '../../components/SectionTopMenu'
import AuditLogBrowser from '../../components/audit-log/AuditLogBrowser'

import TeamAPI from '@/api/team'

import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'TeamAuditLog',
    components: {
        SectionTopMenu,
        AuditLogBrowser
    },
    mixins: [permissionsMixin],
    props: ['team', 'teamMembership'],
    data () {
        return {
            logEntries: [],
            users: []
        }
    },
    watch: {
        team: 'triggerLoad',
        teamMembership: 'triggerLoad'
    },
    created () {
        this.loadUsers()
    },
    methods: {
        async loadUsers () {
            this.users = (await TeamAPI.getTeamMembers(this.team.id)).members
        },
        async loadEntries (params = new URLSearchParams(), cursor = undefined) {
            if (!this.hasPermission('team:audit-log')) {
                return this.$router.push({ path: `/team/${this.team.slug}/overview` })
            }

            const teamId = this.team.id
            if (teamId) {
                this.logEntries = (await TeamAPI.getTeamAuditLog(teamId, params, cursor, 200)).log
            }
        },
        triggerLoad () {
            this.$refs.AuditLog?.loadEntries()
            this.loadUsers()
        }
    }
}
</script>
