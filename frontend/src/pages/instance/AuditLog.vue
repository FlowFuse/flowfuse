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
                includeChildren: true,
                user: null,
                event: null
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
            this.$refs.AuditLog?.loadEntries()
        },
        'team.id': {
            handler: function (teamId) { if (teamId) this.loadUsers() },
            immediate: true
        },
        'auditFilters.selectedEventScope': function () {
            this.loadEntries()
        },
        'auditFilters.includeChildren': function () {
            this.loadEntries()
        }
    },
    mounted () {
        if (!this.users || !this.users.length || !this.logEntries || !this.logEntries.length) {
            this.loadUsers()
            this.loadEntries()
        }
    },
    methods: {
        async loadUsers () {
            this.users = (await TeamAPI.getTeamMembers(this.team.id)).members
        },
        async loadEntries (params = new URLSearchParams(), cursor = undefined) {
            if (params.has('event')) {
                this.auditFilters.event = params.get('event') || null
            }
            if (params.has('username')) {
                this.auditFilters.username = params.get('username') || null
            }

            if (this.instance.id) {
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
        }
    }
}
</script>
