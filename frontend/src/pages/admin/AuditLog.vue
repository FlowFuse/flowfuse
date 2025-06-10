<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Platform Audit Log">
                <template #context>
                    Recorded events that have taken place at the Platform level.
                </template>
            </ff-page-header>
        </template>
        <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" logType="platform" @load-entries="loadEntries" />
    </ff-page>
</template>

<script>
import { mapState } from 'vuex'

import AdminAPI from '../../api/admin.js'
import UsersAPI from '../../api/users.js'
import AuditLogBrowser from '../../components/audit-log/AuditLogBrowser.vue'

export default {
    name: 'PlatformAuditLog',
    components: {
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
