<template>
    <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" :associations="associations" :logType="logScope" @load-entries="loadEntries">
        <template #title>
            <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in within this application." />
        </template>
        <template #extraFilters>
            <FormHeading class="mt-4">Event Scope:</FormHeading>
            <div data-el="filter-event-types">
                <ff-listbox
                    v-model="auditFilters.selectedEventScope"
                    :options="instanceList"
                    placeholder="This Application"
                    value-key="id"
                    label-key="name"
                    class="w-full"
                />
                <ff-checkbox v-model="auditFilters.includeChildren" class="mt-2" data-action="include-children-check">
                    <template v-if="logScope === 'application'">
                        Include Instances and Devices
                    </template>
                    <template v-else-if="logScope === 'project'">
                        Include Devices
                    </template>
                </ff-checkbox>
            </div>
        </template>
    </AuditLogBrowser>
</template>

<script>
import { mapState } from 'vuex'

import ApplicationApi from '../../api/application.js'
import InstanceApi from '../../api/instances.js'
import TeamAPI from '../../api/team.js'
import FormHeading from '../../components/FormHeading.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import AuditLogBrowser from '../../components/audit-log/AuditLogBrowser.vue'
import FfListbox from '../../ui-components/components/form/ListBox.vue'

export default {
    name: 'ApplicationActivity',
    components: {
        FfListbox,
        SectionTopMenu,
        AuditLogBrowser,
        FormHeading
    },
    inheritAttrs: false,
    props: {
        instances: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            logEntries: [],
            associations: {}, // applications, instances, devices
            users: [],
            auditFilters: {
                selectedEventScope: '',
                includeChildren: true
            }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        instanceList () {
            return [
                { name: 'This Application', id: '' },
                ...this.instances.map(instance => ({
                    name: instance.name,
                    id: instance.id
                }))
            ]
        },
        applicationId () {
            return this.$route.params.id
        },
        logScope () {
            return !this.auditFilters.selectedEventScope ? 'application' : 'project' // cannot use 'instance' due to legacy naming
        }
    },
    watch: {
        'auditFilters.selectedEventScope': 'triggerLoad',
        'auditFilters.includeChildren': 'triggerLoad',
        team: function () {
            this.triggerLoad({ users: true, events: true })
        }
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
            const paramScope = (params.has('scope') ? params.get('scope') : this.auditFilters.selectedEventScope) || 'application'
            let includeChildren = this.auditFilters.includeChildren
            if (params.has('includeChildren')) {
                includeChildren = params.get('includeChildren') === 'true'
            }
            params.set('includeChildren', includeChildren)
            params.set('scope', paramScope)
            if (this.applicationId) {
                let log
                if (paramScope === 'application') {
                    log = (await ApplicationApi.getApplicationAuditLog(this.applicationId, params, cursor, 200))
                } else {
                    const instanceId = this.auditFilters.selectedEventScope
                    log = (await InstanceApi.getInstanceAuditLog(instanceId, params, cursor, 200))
                }
                this.logEntries = log.log
                this.associations = includeChildren ? log.associations : null
            }
        },
        triggerLoad ({ users = false, events = true } = {}) {
            // if `events` is true, call AuditLogBrowser.loadEntries - this will emit 'load-entries' event which calls this.loadEntries with appropriate params
            const scope = !this.auditFilters.selectedEventScope ? 'application' : 'project'
            events && this.$refs.AuditLog?.loadEntries(scope, this.auditFilters.includeChildren, scope)
            users && this.loadUsers()
        }
    }
}
</script>
