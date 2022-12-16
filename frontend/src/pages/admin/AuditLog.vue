<template>
    <div class="ff-admin-audit">
        <div>
            <SectionTopMenu hero="Platform Activity" />
            <AuditLog :entries="filteredEntries" />
        </div>
        <div>
            <SectionTopMenu hero="Filters" />
            <ff-text-input v-model="auditFilters.string" placeholder="Search Activity...">
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
            auditFilters: {
                string: ''
            }
        }
    },
    computed: {
        ...mapState('account', ['user']),
        filteredEntries () {
            const filtered = this.entries.filter((entry) => {
                return entry.event.includes(this.auditFilters.string)
            })
            return filtered
        }
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
            console.log(Array.isArray(this.entries))
        }
    },
    components: {
        AuditLog,
        SectionTopMenu,
        SearchIcon
    }
}
</script>
