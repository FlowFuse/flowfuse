<template>
    <div class="mb-3">
        <SectionTopMenu hero="Audit Log" info=""></SectionTopMenu>
    </div>
    <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" logType="project" @load-entries="loadEntries" />
</template>

<script>
import { mapState } from 'vuex'

import SectionTopMenu from '../../components/SectionTopMenu.vue'
import AuditLogBrowser from '../../components/audit-log/AuditLogBrowser'

import InstanceApi from '../../api/instances'
import TeamAPI from '../../api/team'

export default {
    name: 'InstanceAuditLog',
    components: {
        SectionTopMenu,
        AuditLogBrowser
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
            users: []
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    watch: {
        instance () {
            this.$refs.AuditLog?.loadEntries()
        }
    },
    created () {
        this.loadUsers()
    },
    methods: {
        async loadUsers () {
            this.users = (await TeamAPI.getTeamMembers(this.team.id)).members
        },
        async loadEntries (params = new URLSearchParams(), cursor = undefined) {
            const instanceId = this.instance.id
            this.logEntries = (await InstanceApi.getInstanceAuditLog(instanceId, params, cursor, 200)).log
        }
    }
}
</script>
