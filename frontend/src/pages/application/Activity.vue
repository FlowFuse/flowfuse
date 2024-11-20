<template>
    <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" :associations="associations" :logType="logScope" @load-entries="loadEntries">
        <template #title>
            <SectionTopMenu hero="Audit Log" info="Recorded events that have taken place in within this application." />
        </template>
        <template #extraFilters>
            <FormHeading class="mt-4">Event Scope:</FormHeading>
            <div data-el="filter-event-types">
                <ff-dropdown v-model="auditFilters.selectedEventScope" class="w-full">
                    <ff-dropdown-option
                        v-for="instance in instanceList" :key="instance.id"
                        :label="instance.name" :value="instance.id"
                    />
                </ff-dropdown>
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

export default {
    name: 'ApplicationAuditLog',
    components: {
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
                includeChildren: true
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
        auditFilters: {
            deep: true,
            handler () {
                this.$refs.AuditLog?.loadEntries(this.logScope)
            }
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
            if (this.applicationId) {
                params.set('includeChildren', !!this.auditFilters.includeChildren)
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
