<template>
    <div class="ff-admin-audit">
        <div>
            <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in this Team." />
            <AuditLog :entries="entries" />
        </div>
    </div>
</template>

<script>
import { SearchIcon } from '@heroicons/vue/outline'

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
        this.loadUsers()
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
        },
        loadUsers () {
            console.log('this.team')
            console.log(this.team)
            teamApi.getTeamMembers(this.team.id).then((data) => {
                this.auditFilters.users = data.users.map((user) => {
                    user.checked = true
                    return user
                })
            })
        }
    },
    components: {
        SearchIcon,
        AuditLog,
        SectionTopMenu
    }
}
</script>
