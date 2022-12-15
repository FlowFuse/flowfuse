<template>
    <div class="ff-admin-audit">
        <div>
            <SectionTopMenu hero="Platform Activity" />
            <AuditLog :entries="entries" />
        </div>
        <div>
            <SectionTopMenu hero="Filters" />
            <ff-text-input v-model="filters.string" placeholder="Search Activity...">
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
            entries: null,
            filters: {
                string: ''
            }
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
            const result = await this.loadItems('audit')
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
