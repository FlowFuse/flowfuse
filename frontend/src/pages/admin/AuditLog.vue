<template>
    <SectionTopMenu hero="Platform Audit Log" />
    <AuditLog :entity="entity" :loadItems="loadItems" />
</template>

<script>
import { mapState } from 'vuex'
import SectionTopMenu from '@/components/SectionTopMenu'
import AuditLog from '@/components/audit-log/AuditLog'
import adminApi from '@/api/admin'

export default {
    name: 'PlatformAuditLog',
    data () {
        return {
            entity: null
        }
    },
    computed: {
        ...mapState('account', ['user'])
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        loadItems: async function (entityId, cursor) {
            return await adminApi.getPlatformAuditLog(cursor)
        },
        fetchData: async function () {
            this.entity = { id: 'audit' }
        }
    },
    components: {
        AuditLog,
        SectionTopMenu
    }
}
</script>
