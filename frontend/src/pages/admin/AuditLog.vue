<template>
    <div class="ff-admin-audit">
        <div>
            <SectionTopMenu hero="Platform Audit Log" info="Recorded events that have taken place at the Platform level."/>
            <AuditLog :entries="entries" />
        </div>
        <div>
            <SectionTopMenu hero="Filters" />
            <FormHeading class="mt-4">Search:</FormHeading>
            <ff-text-input v-model="auditFilters.string" placeholder="Search Activity...">
                <template v-slot:icon><SearchIcon/></template>
            </ff-text-input>
            <FormHeading class="mt-4">User:</FormHeading>
            <div>
                <ff-dropdown class="w-full" v-model="auditFilters.user">
                    <ff-dropdown-option label="Not Specified" :value="undefined"></ff-dropdown-option>
                    <ff-dropdown-option v-for="user in auditFilters.users" :key="user.username"
                                        :label="`${user.name} (${user.username})`" :value="user.username"></ff-dropdown-option>
                </ff-dropdown>
            </div>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import { SearchIcon } from '@heroicons/vue/outline'

import SectionTopMenu from '@/components/SectionTopMenu'
import AuditLog from '@/components/audit-log/AuditLog'
import FormHeading from '@/components/FormHeading'

import AdminAPI from '@/api/admin'
import UsersAPI from '@/api/users'

let timer = null

export default {
    name: 'PlatformAuditLog',
    data () {
        return {
            entries: null,
            auditFilters: {
                string: '',
                user: null,
                users: []
            }
        }
    },
    computed: {
        ...mapState('account', ['user'])
    },
    watch: {
        'auditFilters.string': function () {
            if (timer) {
                clearTimeout(timer)
            }
            timer = setTimeout(() => {
                this.fetchData()
            }, 300)
        },
        'auditFilters.user': function () {
            this.fetchData()
        }
    },
    mounted () {
        this.loadUsers()
        this.fetchData()
    },
    methods: {
        loadItems: async function (cursor) {
            const params = new URLSearchParams()
            if (this.auditFilters.string) {
                params.append('query', this.auditFilters.string)
            }
            if (this.auditFilters.user) {
                params.append('username', this.auditFilters.user)
            }
            return await AdminAPI.getPlatformAuditLog(params, cursor, 200)
        },
        loadUsers () {
            UsersAPI.getUsers().then((data) => {
                this.auditFilters.users = data.users.map((user) => {
                    user.checked = true
                    return user
                })
            })
        },
        fetchData: async function () {
            const result = await this.loadItems('audit')
            this.entries = result.log
        }
    },
    components: {
        AuditLog,
        FormHeading,
        SectionTopMenu,
        SearchIcon
    }
}
</script>
