<template>
    <div class="ff-admin-audit">
        <div data-el="audit-log">
            <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in this Team." />
            <AuditLog :entries="entries" />
        </div>
        <div>
            <SectionTopMenu hero="Filters" />
            <FormHeading class="mt-4">Event Type:</FormHeading>
            <div data-el="filter-event-types">
                <ff-dropdown class="w-full" v-model="auditFilters.type">
                    <ff-dropdown-option label="Not Specified" :value="undefined"></ff-dropdown-option>
                    <ff-dropdown-option v-for="eType in auditFilters.types" :key="eType[1]"
                                        :label="`${eType[0]}`" :value="eType[1]"></ff-dropdown-option>
                </ff-dropdown>
            </div>
            <FormHeading class="mt-4">User:</FormHeading>
            <div data-el="filter-users">
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
import teamApi from '@/api/team'

import SectionTopMenu from '@/components/SectionTopMenu'
import AuditLog from '@/components/audit-log/AuditLog'
import FormHeading from '@/components/FormHeading'

import permissionsMixin from '@/mixins/Permissions'

import AuditEventsService from '@/services/audit-events.js'

export default {
    name: 'TeamAuditLog',
    props: ['team', 'teamMembership'],
    mixins: [permissionsMixin],
    watch: {
        team: 'fetchData',
        teamMembership: 'fetchData',
        'auditFilters.user': function () {
            this.fetchData()
        },
        'auditFilters.type': function () {
            this.fetchData()
        }
    },
    data () {
        return {
            verifiedTeam: null,
            entries: null,
            auditFilters: {
                type: undefined,
                types: [],
                user: null,
                users: []
            }
        }
    },
    mounted () {
        this.loadUsers()
        this.fetchData()

        // convert the audit event labels into an array and alphabetise them
        this.auditFilters.types = Object.entries(AuditEventsService.getGroup('team')).sort((a, b) => {
            if (a[0] < b[0]) {
                return -1
            } else if (a[0] > b[0]) {
                return 1
            }
            return 0
        })
    },
    methods: {
        loadItems: async function (projectId, cursor) {
            const params = new URLSearchParams()
            if (this.auditFilters.user) {
                params.append('username', this.auditFilters.user)
            }
            if (this.auditFilters.type) {
                this.auditFilters.type.forEach((evt) => {
                    params.append('event', evt)
                })
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
            teamApi.getTeamMembers(this.team.id).then((data) => {
                this.auditFilters.users = data.members
            })
        }
    },
    components: {
        AuditLog,
        SectionTopMenu,
        FormHeading
    }
}
</script>
