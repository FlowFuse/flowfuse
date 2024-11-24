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
                    <ff-listbox
                        v-model="auditFilters.selectedEventScope"
                        :options="scopeList"
                        value-key="id"
                        label-key="name"
                        class="w-full"
                    />
                    <ff-checkbox v-if="(auditFilters.selectedEventScope || 'device') !== 'device'" v-model="auditFilters.includeChildren" class="mt-2" data-action="include-children-check">
                        <template v-if="auditFilters.selectedEventScope === 'team'">
                            Applications, Instances and Devices <!-- shortened to prevent wrapping -->
                        </template>
                        <template v-else-if="auditFilters.selectedEventScope === 'application'">
                            Include Instances and Devices
                        </template>
                        <template v-else-if="auditFilters.selectedEventScope === 'project'">
                            Include Devices
                        </template>
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
import FfListbox from '../../ui-components/components/form/ListBox.vue'

export default {
    name: 'TeamAuditLog',
    components: {
        FfListbox,
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
                { name: 'Applications', id: 'application' },
                { name: 'Instances', id: 'project' },
                { name: 'Devices', id: 'device' }
            ]
        }
    },
    computed: {
        logScope () {
            return !this.auditFilters.selectedEventScope ? 'application' : 'project' // cannot use 'instance' due to legacy naming
        }
    },
    watch: {
        'auditFilters.selectedEventScope': function () {
            this.loadEntries()
        },
        'auditFilters.includeChildren': function () {
            this.loadEntries()
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
            if (params.has('event')) {
                this.auditFilters.event = params.get('event')
            }
            if (params.has('username')) {
                this.auditFilters.username = params.get('username')
            }
            if (teamId) {
                params.set('scope', this.auditFilters.selectedEventScope)
                params.set('includeChildren', !!this.auditFilters.includeChildren)
                if (this.auditFilters.event?.length) {
                    params.set('event', this.auditFilters.event)
                } else {
                    params.delete('event')
                }
                if (this.auditFilters.username?.length) {
                    params.set('username', this.auditFilters.username)
                } else {
                    params.delete('username')
                }

                const auditLog = (await TeamAPI.getTeamAuditLog(teamId, params, cursor, 200))
                this.logEntries = auditLog.log
                this.associations = auditLog.associations
            }
        },
        triggerLoad () {
            this.$refs.AuditLog?.loadEntries()
            this.loadUsers()
        }
    }
}
</script>
