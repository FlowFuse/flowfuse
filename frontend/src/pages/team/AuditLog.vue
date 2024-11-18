<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Audit Log">
                <template #context>
                    Detailed recording of all activity at the team-level.
                </template>
            </ff-page-header>
        </template>
        <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" :associations="associations" logType="team" @load-entries="loadEntries">
            <template #title>
                <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in this Team." />
            </template>
            <template #extraFilters>
                <FormHeading class="mt-4">Event Scope:</FormHeading>
                <div data-el="filter-event-types">
                    <ff-dropdown v-model="auditFilters.selectedEventScope" class="w-full">
                        <ff-dropdown-option
                            v-for="scope in scopeList" :key="scope.id"
                            :label="scope.name" :value="scope.id"
                        />
                    </ff-dropdown>
                    <ff-checkbox v-if="auditFilters.selectedEventScope!=='device'" v-model="auditFilters.includeChildren" class="mt-2" data-action="include-children-check">
                        Include Children
                    </ff-checkbox>
                </div>
            </template>
        </AuditLogBrowser>
    </ff-page>
</template>

<script>
import TeamAPI from '../../api/team.js'
import FormHeading from '../../components/FormHeading.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import AuditLogBrowser from '../../components/audit-log/AuditLogBrowser.vue'
import permissionsMixin from '../../mixins/Permissions.js'

export default {
    name: 'TeamAuditLog',
    components: {
        AuditLogBrowser,
        FormHeading,
        SectionTopMenu
    },
    mixins: [permissionsMixin],
    data () {
        return {
            logEntries: [],
            associations: {}, // applications, instances, devices
            users: [],
            auditFilters: {
                selectedEventScope: 'team',
                includeChildren: true
            },
            scopeList: [
                { name: 'Team', id: 'team' },
                { name: 'Application', id: 'application' },
                { name: 'Instance', id: 'project' },
                { name: 'Device', id: 'device' }
            ]
        }
    },
    computed: {
        logScope () {
            return this.auditFilters.selectedEventScope === null ? 'application' : 'project' // cannot use 'instance' due to legacy naming
        }
    },
    watch: {
        auditFilters: {
            deep: true,
            handler () {
                this.loadEntries()
            }
        },
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
                params.set('scope', this.auditFilters.selectedEventScope)
                params.set('includeChildren', !!this.auditFilters.includeChildren)
                const response = (await TeamAPI.getTeamAuditLog(teamId, params, cursor, 200))
                this.logEntries = response.log
                this.associations = response.associations || {}
            }
        },
        triggerLoad () {
            this.$refs.AuditLog?.loadEntries()
            this.loadUsers()
        }
    }
}
</script>
