<template>
    <div class="ff-admin-audit">
        <div>
            <SectionTopMenu hero="Platform Activity" />
            <AuditLog :entity="entity" :entries="entries" />
        </div>
        <div>
            <SectionTopMenu hero="Filters" />
            <ff-text-input placeholder="Search Activity...">
                <template v-slot:icon><SearchIcon/></template>
            </ff-text-input>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import { SearchIcon } from '@heroicons/vue/outline'
import SectionTopMenu from '@/components/SectionTopMenu'
import AuditLog from '@/components/audit-log/AuditLog'
import adminApi from '@/api/admin'

export default {
    name: 'PlatformAuditLog',
    data () {
        return {
            entity: null,
            entries: null
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
            const result = await this.loadItems(this.entity.id)
            this.entries = result.log
        }
    },
    components: {
        AuditLog,
        SectionTopMenu,
        SearchIcon
    }
}
</script>
