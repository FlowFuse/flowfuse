<template>
    <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" :logType="logScope" @load-entries="loadEntries">
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
                    label-key="name"
                    value-key="id"
                    class="w-full"
                />
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
    name: 'ApplicationAuditLog',
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
            users: [],
            auditFilters: {
                selectedEventScope: null
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
        'auditFilters.selectedEventScope' () {
            this.$refs.AuditLog?.loadEntries(this.logScope)
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
                if (this.auditFilters.selectedEventScope === null) {
                    this.logEntries = (await ApplicationApi.getApplicationAuditLog(this.applicationId, params, cursor, 200)).log
                } else if (this.auditFilters.selectedEventScope) {
                    const instanceId = this.auditFilters.selectedEventScope
                    this.logEntries = (await InstanceApi.getInstanceAuditLog(instanceId, params, cursor, 200)).log
                }
            }
        }
    }
}
</script>
