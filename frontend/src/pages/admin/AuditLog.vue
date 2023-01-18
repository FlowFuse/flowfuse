<template>
    <div class="ff-admin-audit">
        <div>
            <SectionTopMenu hero="Platform Audit Log" info="Recorded events that have taken place at the Platform level."/>
            <AuditLog :entries="entries" />
        </div>
        <div>
            <SectionTopMenu hero="Filters" />
            <FormHeading class="mt-4">Event Type:</FormHeading>
            <div data-el="filter-event-types">
                <ff-dropdown class="w-full" v-model="auditFilters.type">
                    <ff-dropdown-option label="Not Specified" :value="undefined"></ff-dropdown-option>
                    <ff-dropdown-option v-for="eType in auditFilters.types" :key="eType[1]"
                                        :label="eType[0]" :value="eType[1]"></ff-dropdown-option>
                </ff-dropdown>
            </div>
            <FormHeading class="mt-4">User:</FormHeading>
            <div data-el="filter-users">
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

import SectionTopMenu from '@/components/SectionTopMenu'
import AuditLog from '@/components/audit-log/AuditLog'
import FormHeading from '@/components/FormHeading'

import AdminAPI from '@/api/admin'
import UsersAPI from '@/api/users'

import AuditEventsService from '@/services/audit-events.js'

export default {
    name: 'PlatformAuditLog',
    data () {
        return {
            entries: null,
            auditFilters: {
                type: undefined,
                types: [],
                user: null,
                users: []
            }
        }
    },
    computed: {
        ...mapState('account', ['user'])
    },
    watch: {
        'auditFilters.user': function () {
            this.fetchData()
        },
        'auditFilters.type': function () {
            this.fetchData()
        }
    },
    mounted () {
        this.loadUsers()

        // convert the audit event labels into an array and alphabetise them
        this.auditFilters.types = Object.entries(AuditEventsService.getGroup('platform')).sort((a, b) => {
            if (a[0] < b[0]) {
                return -1
            } else if (a[0] > b[0]) {
                return 1
            }
            return 0
        })

        this.fetchData()
    },
    methods: {
        loadItems: async function (cursor) {
            const params = new URLSearchParams()
            if (this.auditFilters.user) {
                params.append('username', this.auditFilters.user)
            }
            if (this.auditFilters.type) {
                this.auditFilters.type.forEach((evt) => {
                    params.append('event', evt)
                })
            }
            return await AdminAPI.getPlatformAuditLog(params, cursor, 200)
        },
        loadUsers () {
            UsersAPI.getUsers().then((data) => {
                this.auditFilters.users = data.users
            })
        },
        fetchData: async function () {
            const result = await this.loadItems()
            this.entries = result.log
        }
    },
    components: {
        AuditLog,
        FormHeading,
        SectionTopMenu
    }
}
</script>
