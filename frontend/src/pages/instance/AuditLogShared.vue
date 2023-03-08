<template>
    <div class="ff-admin-audit">
        <div data-el="audit-log">
            <slot name="title" />
            <AuditLog :entries="logEntries" />
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
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import TeamAPI from '@/api/team'

import FormHeading from '@/components/FormHeading'
import AuditLog from '@/components/audit-log/AuditLog'

import AuditEventsService from '@/services/audit-events.js'

export default {
    name: 'AuditLogPage',
    components: {
        AuditLog,
        SectionTopMenu,
        FormHeading
    },
    inheritAttrs: false,
    props: {
        team: {
            type: Object,
            required: true
        },
        logEntries: {
            type: Array,
            required: true
        },
        logType: {
            type: String,
            required: true
        }
    },
    emits: ['load-entries'],
    data () {
        return {
            loading: true,
            auditFilters: {
                type: undefined,
                types: [],
                user: null,
                users: []
            }
        }
    },
    watch: {
        'auditFilters.user': function () {
            this.loadEntries()
        },
        'auditFilters.type': function () {
            this.loadEntries()
        }
    },
    created () {
        this.loadUsers()
        this.loadEntries()

        // convert the audit event labels into an array and alphabetise them
        this.auditFilters.types = Object.entries(AuditEventsService.getGroup(this.logType)).sort((a, b) => {
            if (a[0] < b[0]) {
                return -1
            } else if (a[0] > b[0]) {
                return 1
            }
            return 0
        })
    },
    methods: {
        loadEntries () {
            const params = new URLSearchParams()
            if (this.auditFilters.user) {
                params.append('username', this.auditFilters.user)
            }
            if (this.auditFilters.type) {
                this.auditFilters.type.forEach((evt) => {
                    params.append('event', evt)
                })
            }

            this.$emit('load-entries', params)
        },
        loadUsers () {
            TeamAPI.getTeamMembers(this.team.id).then((data) => {
                this.auditFilters.users = data.members
            })
        }
    }
}
</script>
