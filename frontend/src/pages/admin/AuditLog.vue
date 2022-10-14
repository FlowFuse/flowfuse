<template>
    <SectionTopMenu hero="Platform Audit Log" />
    <AuditLog :entity="entity" :loadItems="loadItems" />
</template>

<script>
import { mapState } from 'vuex'
import SectionTopMenu from '@/components/SectionTopMenu'
import AuditLog from '@/components/AuditLog'
import permissionsMixin from '@/mixins/Permissions'
import adminApi from '@/api/admin'

export default {
    name: 'PlatformAuditLog',
    mixins: [permissionsMixin],
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
            if (this.hasPermission('platform:audit-log')) {
                this.entity = { id: 'audit' }
            } else {
                this.$router.push({ path: '/' })
            }
        }
    },
    components: {
        AuditLog,
        SectionTopMenu
    }
}
</script>
