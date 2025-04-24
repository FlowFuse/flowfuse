<template>
    <div class="ff-admin-audit overflow-auto">
        <div data-el="audit-log" class="overflow-auto">
            <slot name="title" />
            <AuditLog :entries="logEntries" :associations="associations" />
        </div>
        <div class="overflow-auto">
            <SectionTopMenu hero="Filters" />
            <slot name="extraFilters" />
            <FormHeading class="mt-4">Event Type:</FormHeading>
            <div data-el="filter-event-types">
                <ff-listbox
                    v-model="auditFilters.event"
                    :options="typeOptions"
                    placeholder="Show All"
                    class="w-full"
                />
            </div>
            <FormHeading class="mt-4">User:</FormHeading>
            <div data-el="filter-users">
                <ff-listbox
                    v-model="auditFilters.username"
                    :options="userOptions"
                    placeholder="Show All"
                    class="w-full"
                />
            </div>
        </div>
    </div>
</template>

<script>
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import AuditEventsService from '../../services/audit-events.js'
import FfListbox from '../../ui-components/components/form/ListBox.vue'
import FormHeading from '../FormHeading.vue'

import AuditLog from './AuditLog.vue'

export default {
    name: 'AuditLogBrowser',
    components: {
        FfListbox,
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
        associations: {
            type: Object,
            default: () => {}
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
                event: '',
                types: [],
                username: '',
                users: [],
                scope: ''
            }
        }
    },
    computed: {
        typeOptions () {
            return [
                { label: 'Show All', value: '' },
                ...this.auditFilters.types.map(type => ({ label: type[0], value: type[1][0] }))
            ]
        },
        userOptions () {
            return [
                { label: 'Show All', value: '' },
                ...this.auditFilters.users.map(user => ({
                    label: `${user.name} (${user.username})`,
                    value: user.username
                }
                ))
            ]
        }
    },
    watch: {
        'auditFilters.username': function () {
            if (this.loading || this.gettingEntries) {
                return // skip if we're already loading entries
            }
            this.loadEntries()
        },
        'auditFilters.event': function () {
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
        this.auditFilters.logType = this.logType // init the scope to the logType
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
         * @param {boolean} [includeChildren=false] Whether to include children in the log scope
         * @param {string} [logType] The log type to load event type dropdown for
         */
        loadEntries (scope, includeChildren, logType) {
            this.gettingEntries = true
            logType = logType || this.auditFilters.logType
            if (this.auditFilters.logType !== logType) {
                this.auditFilters.logType = logType // store the scope for later queries
                // clear this.auditFilters.event without triggering a watch
                this.auditFilters.event = undefined // clear the "event filter" as scope has changed
                this.loadEventTypes(logType)
            }
            this.auditFilters.scope = scope || this.auditFilters.scope
            const params = new URLSearchParams()
            if (this.auditFilters.username) {
                params.append('username', this.auditFilters.username)
            }
            if (this.auditFilters.event) {
                params.append('event', this.auditFilters.event)
            }
            params.append('scope', scope || this.auditFilters.scope)
            if (typeof includeChildren === 'boolean') {
                params.append('includeChildren', includeChildren)
            }
            this.$emit('load-entries', params)
            this.gettingEntries = false
        },
        loadEventTypes (scope) {
            scope = scope || this.auditFilters.scope

            if (scope) {
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
}
</script>
