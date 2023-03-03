<template>
    <div class="ff-admin-audit">
        <div data-el="audit-log">
            <AuditLog :entries="entries" />
        </div>
        <div>
            <SectionTopMenu hero="Filters" />
            <FormHeading class="mt-4">Event Type:</FormHeading>
            <div data-el="filter-event-types">
                <ff-dropdown v-model="auditFilters.type" class="w-full">
                    <ff-dropdown-option label="Not Specified" :value="undefined" />
                    <ff-dropdown-option
                        v-for="eType in auditFilters.types" :key="eType[1]"
                        :label="`${eType[0]}`" :value="eType[1]"
                    />
                </ff-dropdown>
            </div>
            <FormHeading class="mt-4">User:</FormHeading>
            <div data-el="filter-users">
                <ff-dropdown v-model="auditFilters.user" class="w-full">
                    <ff-dropdown-option label="Not Specified" :value="undefined" />
                    <ff-dropdown-option
                        v-for="user in auditFilters.users" :key="user.username"
                        :label="`${user.name} (${user.username})`" :value="user.username"
                    />
                </ff-dropdown>
            </div>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import SectionTopMenu from '../../components/SectionTopMenu.vue'

import InstanceApi from '@/api/instances'
import TeamAPI from '@/api/team'

import FormHeading from '@/components/FormHeading'
import AuditLog from '@/components/audit-log/AuditLog'

import AuditEventsService from '@/services/audit-events.js'

export default {
    name: 'InstanceAuditLog',
    components: {
        AuditLog,
        SectionTopMenu,
        FormHeading
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
            loading: true,
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
        ...mapState('account', ['team'])
    },
    watch: {
        instance: function () {
            this.loadLog()
        },
        'auditFilters.user': function () {
            this.loadLog()
        },
        'auditFilters.type': function () {
            this.loadLog()
        }
    },
    mounted () {
        this.loadUsers()
        this.loadLog()

        // convert the audit event labels into an array and alphabetise them
        this.auditFilters.types = Object.entries(AuditEventsService.getGroup('project')).sort((a, b) => {
            if (a[0] < b[0]) {
                return -1
            } else if (a[0] > b[0]) {
                return 1
            }
            return 0
        })
    },
    methods: {
        loadItems: async function (projectId, cursor) {
            if (projectId) {
                const params = new URLSearchParams()
                if (this.auditFilters.user) {
                    params.append('username', this.auditFilters.user)
                }
                if (this.auditFilters.type) {
                    this.auditFilters.type.forEach((evt) => {
                        params.append('event', evt)
                    })
                }
                return await InstanceApi.getInstanceAuditLog(projectId, params, cursor, 200)
            }
        },
        async loadLog () {
            const audit = await this.loadItems(this.instance.id)
            if (audit) {
                this.entries = audit.log
            }
        },
        loadUsers () {
            TeamAPI.getTeamMembers(this.team.id).then((data) => {
                this.auditFilters.users = data.members
            })
        }
    }
}
</script>
