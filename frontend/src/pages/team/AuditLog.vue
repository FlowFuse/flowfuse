<template>
    <AuditLogShared ref="AuditLog" :users="users" :logEntries="logEntries" logType="team" @load-entries="loadEntries">
        <template #title>
            <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in this Team." />
        </template>
    </AuditLogShared>
</template>

<script>
import TeamAPI from '@/api/team'

import SectionTopMenu from '@/components/SectionTopMenu'

import permissionsMixin from '@/mixins/Permissions'

import AuditLogShared from '@/pages/instance/AuditLogShared'

export default {
    name: 'TeamAuditLog',
    components: {
        SectionTopMenu,
        AuditLogShared
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
