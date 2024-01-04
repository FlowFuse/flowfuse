<template>
    <div class="mb-3">
        <SectionTopMenu hero="Audit Log" info="" />
    </div>
    <AuditLogBrowser ref="AuditLog" :users="users" :logEntries="logEntries" logType="device" @load-entries="loadEntries" />
</template>

<script>
import { mapState } from 'vuex'

import DeviceApi from '../../api/devices.js'
import TeamAPI from '../../api/team.js'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import AuditLogBrowser from '../../components/audit-log/AuditLogBrowser.vue'

export default {
    name: 'DeviceAuditLog',
    components: {
        SectionTopMenu,
        AuditLogBrowser
    },
    inheritAttrs: false,
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            loadEntries: [],
            users: []
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    watch: {
        device () {

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
            const deviceId = this.device.id
            this.logEntries = (await DeviceApi.getInstanceAuditLog(deviceId, params, cursor, 200)).log
        }
    }
}
</script>
