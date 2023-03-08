<template>
    <AuditLogShared :team="team" :logEntries="logEntries" logType="project" @load-entries="loadEntries" />
</template>

<script>
import { mapState } from 'vuex'

import AuditLogShared from './AuditLogShared'

import InstanceApi from '@/api/instances'

export default {
    name: 'InstanceAuditLog',
    components: {
        AuditLogShared
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
            logEntries: []
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    methods: {
        loadEntries: async function (params = new URLSearchParams(), cursor = undefined) {
            const instanceId = this.instance.id
            this.logEntries = (await InstanceApi.getInstanceAuditLog(instanceId, params, cursor, 200)).log
        }
    }
}
</script>
