<template>
    <div class="ff-admin-audit">
        <div>
            <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in this Team." />
            <AuditLog :entries="entries" />
        </div>
        <div>
            <SectionTopMenu hero="Filters" />
            <FormHeading class="mt-4">Search:</FormHeading>
            <ff-text-input v-model="auditFilters.string" placeholder="Search Activity...">
                <template v-slot:icon><SearchIcon/></template>
            </ff-text-input>
            <FormHeading class="mt-4">User:</FormHeading>
            <div>
                <ff-dropdown class="w-full" v-model="auditFilters.user">
                    <ff-dropdown-option label="Not Specified" :value="undefined"></ff-dropdown-option>
                    <ff-dropdown-option v-for="user in auditFilters.users" :key="user.username"
                                        :label="`${user.name} (${user.username})`" :value="user.username"></ff-dropdown-option>
                </ff-dropdown>
            </div>
        </div>
    </div>
</template>

<script>
import { SearchIcon } from '@heroicons/vue/outline'

import teamApi from '@/api/team'

import SectionTopMenu from '@/components/SectionTopMenu'
import AuditLog from '@/components/audit-log/AuditLog'
import FormHeading from '@/components/FormHeading'

import permissionsMixin from '@/mixins/Permissions'

let timer = null

export default {
    name: 'TeamAuditLog',
    props: ['team', 'teamMembership'],
    mixins: [permissionsMixin],
    watch: {
        team: 'fetchData',
        teamMembership: 'fetchData',
        'auditFilters.string': function () {
            if (timer) {
                clearTimeout(timer)
            }
            timer = setTimeout(() => {
                this.fetchData()
            }, 300)
        },
        'auditFilters.user': function () {
            this.fetchData()
        }
    },
    data () {
        return {
            verifiedTeam: null,
            entries: null,
            auditFilters: {
                string: '',
                user: null,
                users: []
            }
        }
    },
    mounted () {
        this.loadUsers()
        this.fetchData()
    },
    methods: {
        loadItems: async function (projectId, cursor) {
            const params = new URLSearchParams()
            if (this.auditFilters.string) {
                params.append('query', this.auditFilters.string)
            }
            if (this.auditFilters.user) {
                params.append('username', this.auditFilters.user)
            }
            return await teamApi.getTeamAuditLog(projectId, params, cursor, 200)
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
            console.log(this.team.id)
            teamApi.getTeamMembers(this.team.id).then((data) => {
                this.auditFilters.users = data.members
            })
        }
    },
    components: {
        SearchIcon,
        AuditLog,
        SectionTopMenu,
        FormHeading
    }
}
</script>
