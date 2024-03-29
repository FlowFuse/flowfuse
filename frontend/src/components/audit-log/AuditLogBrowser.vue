<template>
    <div class="ff-admin-audit">
        <div data-el="audit-log">
            <slot name="title" />
            <AuditLog :entries="logEntries" />
        </div>
        <div>
            <SectionTopMenu hero="Filters" />
            <slot name="extraFilters" />
            <FormHeading class="mt-4">Event Type:</FormHeading>
            <div data-el="filter-event-types">
                <ff-dropdown v-model="auditFilters.type" class="w-full">
                    <ff-dropdown-option label="Show All" :value="undefined" />
                    <ff-dropdown-option
                        v-for="eType in auditFilters.types" :key="eType[1]"
                        :label="`${eType[0]}`" :value="eType[1]"
                    />
                </ff-dropdown>
            </div>
            <FormHeading class="mt-4">User:</FormHeading>
            <div data-el="filter-users">
                <ff-dropdown v-model="auditFilters.user" class="w-full">
                    <ff-dropdown-option label="Show All" :value="undefined" />
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

import AuditEventsService from '../../services/audit-events.js'
import FormHeading from '../FormHeading.vue'

import AuditLog from './AuditLog.vue'

export default {
    name: 'AuditLogPage',
    components: {
        AuditLog,
        SectionTopMenu,
        FormHeading
    },
    inheritAttrs: false,
    props: {
        users: {
            type: Array,
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
            gettingEntries: false,
            auditFilters: {
                type: undefined,
                types: [],
                user: null,
                users: [],
                scope: undefined
            }
        }
    },
    watch: {
        'auditFilters.user': function () {
            if (this.loading || this.gettingEntries) {
                return // skip if we're already loading entries
            }
            this.loadEntries()
        },
        'auditFilters.type': function () {
            if (this.loading || this.gettingEntries) {
                return // skip if we're already loading entries
            }
            this.loadEntries()
        },
        users: function (users) {
            this.auditFilters.users = users
        }
    },
    created () {
        this.loading = true
        this.auditFilters.scope = this.logType // init the scope to the logType set in the component's props
        this.auditFilters.users = this.users
        this.loadEventTypes()
        this.loadEntries()
        this.loading = false
    },
    methods: {
        /**
         * Load log entries. NOTE: `scope` is optional and will default to the value detected in `this.auditFilters.scope`
         * (which is essentially defaulted to prop `logType` upon creation)
         * @param {'platform'|'application'|'project'|'user'} [scope=this.auditFilters.scope] The log scope to load entries for
         */
        loadEntries (scope) {
            this.gettingEntries = true
            scope = scope || this.auditFilters.scope
            if (this.auditFilters.scope !== scope) {
                this.auditFilters.scope = scope // store the scope for later queries
                // clear this.auditFilters.type without triggering a watch
                this.auditFilters.type = undefined // clear the "event type filter" as scope has changed
                this.loadEventTypes(scope)
            }
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
            this.gettingEntries = false
        },
        loadEventTypes (scope) {
            scope = scope || this.auditFilters.scope
            this.auditFilters.types = Object.entries(AuditEventsService.getGroup(scope)).sort((a, b) => {
                if (a[0] < b[0]) {
                    return -1
                } else if (a[0] > b[0]) {
                    return 1
                }
                return 0
            })
        }
    }
}
</script>
