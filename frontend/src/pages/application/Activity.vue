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
                selectedEventScope: null,
                includeChildren: true,
                username: null,
                event: null
            }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        instanceList () {
            return [
                { name: 'This Application', id: null },
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
            return this.auditFilters.selectedEventScope === null ? 'application' : 'project' // cannot use 'instance' due to legacy naming
        }
    },
    watch: {
        'auditFilters.selectedEventScope': function () {
            this.loadEntries()
        },
        'auditFilters.includeChildren': function () {
            this.loadEntries()
        },
        team: 'loadUsers'
    },
    created () {
        this.loadUsers()
    },
    methods: {
        async loadUsers () {
            this.users = (await TeamAPI.getTeamMembers(this.team.id)).members
        },
        async loadEntries (params = new URLSearchParams(), cursor = undefined) {
            if (params.has('event')) {
                this.auditFilters.event = params.get('event')
            }
            if (params.has('username')) {
                this.auditFilters.username = params.get('username')
            }

            if (this.applicationId) {
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
                if (this.auditFilters.selectedEventScope === null) {
                    params.set('scope', 'application')
                    const log = (await ApplicationApi.getApplicationAuditLog(this.applicationId, params, cursor, 200))
                    this.logEntries = log.log
                    this.associations = this.auditFilters.includeChildren ? log.associations : null
                } else if (this.auditFilters.selectedEventScope) {
                    params.set('scope', 'project')
                    const instanceId = this.auditFilters.selectedEventScope
                    const log = (await InstanceApi.getInstanceAuditLog(instanceId, params, cursor, 200))
                    this.logEntries = log.log
                    this.associations = this.auditFilters.includeChildren ? log.associations : null
                }
            }
        }
    }
}
</script>
