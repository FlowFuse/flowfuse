<template>
    <ff-loading v-if="loading" message="Loading Activity..." />
    <ul class="mx-auto">
        <li v-for="item in logEntries" :key="item.id">
            <div v-if="item.date" class="font-medium mt-2 mb-1">{{item.date}}</div>
            <AuditEntry :entry="item"></AuditEntry>
        </li>
        <li v-if="logEntries.length === 0" class="px-8 py-4 text-center">
            <a v-if="!loading">No Audit Entries Found</a>
        </li>
        <li v-if="logEntries.length > 0 && showLoadMore !== false && nextCursor" class="px-8 py-4">
            <a v-if="!loading" @click.stop="loadMore" class="forge-button-inline">Load more...</a>
            <div class="text-gray-500" v-else>Loading...</div>
        </li>
    </ul>
</template>

<script>
/* eslint-disable no-template-curly-in-string */

import AuditEntry from './AuditEntry.vue'

const eventDescriptions = {
    'project.created': 'Project created',
    'project.duplicated': 'Project duplicated',
    'project.deleted': 'Project deleted',
    'project.stopped': 'Project stopped',
    'project.started': 'Project started',
    'auth.login': '${user} logged in',
    'auth.login.revoke': '${user} logged out',
    'flows.set': 'Flows updated',

    // Project Log
    'user.invited': 'User invited',
    'user.uninvited': 'User uninvited',
    'user.invite.accept': '${user} accepted invitation',
    'user.invite.reject': '${user} declined invitation'

}

const eventIcons = {
    'project.started': 'play',
    'project.stopped': 'stop',
    'project.created': 'create',
    'project.duplicated': 'create',
    'project.deleted': 'create',
    'auth.login': 'user',
    'auth.login.revoke': 'logout',
    'flows.set': 'pencil'
}

export default {
    name: 'AuditLog',
    props: ['entity', 'loadItems', 'showLoadMore'],
    watch: {
        entity: 'fetchData'
    },
    data () {
        return {
            nextCursor: null,
            logEntries: [],
            loading: false,
            initialLoad: true
        }
    },
    mounted () {
        this.initialLoad = true
        this.fetchData()
    },
    methods: {
        loadMore: async function () {
            this.loading = true
            const result = await this.loadItems(this.entity.id, this.nextCursor)
            this.nextCursor = result.meta.next_cursor
            // this.logEntries = this.formatResults(this.logEntries.concat(result.log))
            this.loading = false
        },
        formatResults: function (log) {
            let lastDate = null
            return log.map(entry => {
                if (!entry.time) {
                    const date = new Date(entry.createdAt)
                    const thisDate = date.toDateString()
                    if (thisDate !== lastDate) {
                        entry.date = date.toDateString()
                        lastDate = thisDate
                    }
                    entry.time = date.toLocaleTimeString()
                    entry.icon = eventIcons[entry.event] || null
                    entry.title = eventDescriptions[entry.event] || entry.event
                    entry.title = entry.title.replace(/\${user}/g, entry.username)
                } else if (entry.date) {
                    lastDate = entry.date
                }
                return entry
            })
        },
        fetchData: async function (newVal) {
            if (this.initialLoad) {
                this.loading = true
            }
            if (this.entity && this.entity.id) {
                const result = await this.loadItems(this.entity.id)
                // this.logEntries = this.formatResults(result.log)
                this.nextCursor = result.meta.next_cursor
            }
            this.initialLoad = false
            this.loading = false
        }
    },
    components: {
        AuditEntry
    }
}
</script>

<style lang="scss">
@import "@/stylesheets/components/audit-log.scss";
</style>
