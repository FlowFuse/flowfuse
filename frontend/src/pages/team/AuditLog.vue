<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.auditLog')">
                <template #context>
                    {{ $t('ui.detailedRecordingOfAllActivityAtTheTeamLevel') }}
                </template>
            </ff-page-header>
        </template>
        <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" :associations="associations" logType="team" :loading="loading" @load-entries="loadEntries">
            <template #title>
                <SectionTopMenu :hero="$t('ui.auditLog')" :info="$t('ui.recordedEventsThatHaveTakenPlaceInThisTeam')" />
            </template>
            <template #extraFilters>
                <FormHeading class="mt-4">{{ $t('ui.eventScope') }}</FormHeading>
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
                            {{ $t('ui.applicationsInstancesAndDevices') }} <!-- shortened to prevent wrapping -->
                        </template>
                        <template v-else-if="auditFilters.selectedEventScope === 'application'">
                            {{ $t('ui.includeInstancesAndDevices') }}
                        </template>
                        <template v-else-if="auditFilters.selectedEventScope === 'project'">
                            {{ $t('ui.includeDevices') }}
                        </template>
                    </ff-checkbox>
                </div>
            </template>
        </AuditLogBrowser>
    </ff-page>
</template>

<script>
import { mapState } from 'pinia'

import TeamAPI from '../../api/team.js'
import FormHeading from '../../components/FormHeading.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import AuditLogBrowser from '../../components/audit-log/AuditLogBrowser.vue'
import usePermissions from '../../composables/Permissions.js'
import FfListbox from '../../ui-components/components/form/ListBox.vue'

import { useContextStore } from '@/stores/context.js'

export default {
    name: 'TeamAuditLog',
    components: {
        FfListbox,
        AuditLogBrowser,
        FormHeading,
        SectionTopMenu
    },
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data () {
        return {
            logEntries: [],
            loading: true,
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
        ...mapState(useContextStore, ['team', 'teamMembership']),
        logScope () {
            return !this.auditFilters.selectedEventScope ? 'application' : 'project' // cannot use 'instance' due to legacy naming
        }
    },
    watch: {
        'auditFilters.selectedEventScope': 'triggerLoad',
        'auditFilters.includeChildren': 'triggerLoad',
        team: 'triggerLoad',
        teamMembership: 'triggerLoad'
    },
    created () {
        this.triggerLoad({ users: true, events: true })
    },
    methods: {
        async loadUsers () {
            this.users = (await TeamAPI.getTeamMembers(this.team.id)).members
        },
        /**
         * Load audit log entries
         * IMPORTANT: This method should only be called by AuditLogBrowser component when it emits 'load-entries' event
         * To initiate loading of audit log entries, call triggerLoad method
         * @param params - URLSearchParams to append to the request
         * @param cursor - cursor to use for pagination
         */
        async loadEntries (params = new URLSearchParams(), cursor = undefined) {
            if (!this.hasPermission('team:audit-log')) {
                return this.$router.push({ path: `/team/${this.team.slug}/overview` })
            }

            const teamId = this.team.id
            if (teamId) {
                const paramScope = (params.has('scope') ? params.get('scope') : this.auditFilters.selectedEventScope) || 'team'
                let includeChildren = this.auditFilters.includeChildren
                if (params.has('includeChildren')) {
                    includeChildren = params.get('includeChildren') === 'true'
                }
                params.set('includeChildren', includeChildren)
                params.set('scope', paramScope)
                try {
                    const auditLog = (await TeamAPI.getTeamAuditLog(teamId, params, cursor, 200))
                    this.logEntries = auditLog.log
                    this.associations = auditLog.associations
                } catch (error) {
                    console.error('Failed to load audit logs:', error)
                } finally {
                    this.loading = false
                }
            }
        },
        triggerLoad ({ users = false, events = true } = {}) {
            // if `events` is true, call AuditLogBrowser.loadEntries - this will emit 'load-entries' event which calls this.loadEntries with appropriate params
            events && this.$refs.AuditLog?.loadEntries(this.auditFilters.selectedEventScope, this.auditFilters.includeChildren, this.auditFilters.selectedEventScope || 'team')
            users && this.loadUsers()
        }
    }
}
</script>

<style lang="scss">
.ff-admin-audit .ff-accordion {
    margin-bottom: 12px;
}
</style>
