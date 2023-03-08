<template>
    <AuditLogShared ref="AuditLog" :users="users" :logEntries="logEntries" logType="project" @load-entries="loadEntries">
        <template #title>
            <SectionTopMenu hero="Platform Audit Log" info="Recorded events that have taken place at the Platform level." />
        </template>
    </AuditLogShared>
</template>

<script>
import { mapState } from 'vuex'

import AdminAPI from '@/api/admin'
import UsersAPI from '@/api/users'

import SectionTopMenu from '@/components/SectionTopMenu'

import AuditLogShared from '@/pages/instance/AuditLogShared'

export default {
    name: 'PlatformAuditLog',
    components: {
        SectionTopMenu,
        AuditLogShared
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
            this.logEntries = (await AdminAPI.getPlatformAuditLog(params, cursor, 200)).log
        }
    }
}
</script>
