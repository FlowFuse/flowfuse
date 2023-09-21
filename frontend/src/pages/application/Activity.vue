<template>
    <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" logType="project" @load-entries="loadEntries">
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
        }
    },
    watch: {
        'auditFilters.selectedEventScope' () {
            this.$refs.AuditLog?.loadEntries()
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
