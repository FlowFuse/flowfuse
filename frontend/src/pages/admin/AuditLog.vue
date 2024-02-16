<template>
    <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" logType="platform" @load-entries="loadEntries">
        <template #title>
            <SectionTopMenu hero="Platform Audit Log" info="Recorded events that have taken place at the Platform level." />
        </template>
    </AuditLogBrowser>
</template>

<script>
import { mapState } from 'vuex'

import AdminAPI from '../../api/admin.js'
import UsersAPI from '../../api/users.js'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import AuditLogBrowser from '../../components/audit-log/AuditLogBrowser.vue'

export default {
    name: 'PlatformAuditLog',
    components: {
        SectionTopMenu,
        AuditLogBrowser
    },
    data () {
        return {
            logEntries: [],
            users: []
        }
    },
    computed: {
        ...mapState('account', ['user'])
    },
    created () {
        this.loadUsers()
    },
    methods: {
        async loadUsers () {
            this.users = (await UsersAPI.getUsers()).users
        },
        async loadEntries (params = new URLSearchParams(), cursor = undefined) {
            try {
                this.logEntries = (await AdminAPI.getPlatformAuditLog(params, cursor, 200)).log
            } catch (err) {
                if (err.response?.status === 403) {
                    this.$router.push('/')
                }
            }
        }
    }
}
</script>
