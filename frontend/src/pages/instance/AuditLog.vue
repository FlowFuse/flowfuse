<template>
    <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" :associations="associations" logType="project" @load-entries="loadEntries">
        <template #title>
            <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in within this instance." />
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
                    Include Devices
                </ff-checkbox>
            </div>
        </template>
    </AuditLogBrowser>
</template>

<script>
import { mapState } from 'vuex'

import InstanceApi from '../../api/instances.js'
import TeamAPI from '../../api/team.js'
import FormHeading from '../../components/FormHeading.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import AuditLogBrowser from '../../components/audit-log/AuditLogBrowser.vue'
import FfListbox from '../../ui-components/components/form/ListBox.vue'

export default {
    name: 'InstanceAuditLog',
    components: {
        FfListbox,
        AuditLogBrowser,
        FormHeading,
        SectionTopMenu
    },
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            logEntries: [],
            associations: {}, // devices
            users: [],
            auditFilters: {
                selectedEventScope: 'project',
                includeChildren: true
            },
            scopeList: [
                { name: 'This Instance', id: 'project' },
                { name: 'Instance Devices', id: 'device' }
            ]
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    watch: {
        instance () {
            this.triggerLoad({ users: true, events: true })
        },
        'team.id': {
            handler: function (teamId) { if (teamId) this.loadUsers() },
            immediate: true
        },
        'auditFilters.selectedEventScope': 'triggerLoad',
        'auditFilters.includeChildren': 'triggerLoad'
    },
    mounted () {
        if (!this.users || !this.users.length || !this.logEntries || !this.logEntries.length) {
            this.triggerLoad({ users: true, events: true })
        }
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
            if (this.instance.id) {
                const auditLog = (await InstanceApi.getInstanceAuditLog(this.instance.id, params, cursor, 200))
                this.logEntries = auditLog.log
                // dont show associations if we are looking at "this" scope (project)"
                let showAssociations = false
                if (this.auditFilters.selectedEventScope === 'device') {
                    showAssociations = true
                }
                if (this.auditFilters.selectedEventScope === 'project' && this.auditFilters.includeChildren) {
                    showAssociations = true
                }
                this.associations = showAssociations ? auditLog.associations : null
            }
        },
        triggerLoad ({ users = false, events = true } = {}) {
            // if `events` is true, call AuditLogBrowser.loadEntries - this will emit 'load-entries' event which calls this.loadEntries with appropriate params
            const eventTypes = this.auditFilters.selectedEventScope || 'instance'
            events && this.$refs.AuditLog?.loadEntries(this.auditFilters.selectedEventScope, this.auditFilters.includeChildren, eventTypes)
            users && this.loadUsers()
        }

    }
}
</script>
