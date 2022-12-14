<template>
    <ff-loading v-if="loading" message="Loading Activity..." />
    <!-- <li v-if="logEntries.length === 0" class="px-8 py-4 text-center">
        <a v-if="!loading">No Audit Entries Found</a>
    </li>
    <li v-if="logEntries.length > 0 && showLoadMore !== false && nextCursor" class="px-8 py-4">
        <a v-if="!loading" @click.stop="loadMore" class="forge-button-inline">Load more...</a>
        <div class="text-gray-500" v-else>Loading...</div>
    </li> -->
    <ff-accordion v-for="(entries, date) in logEntriesByDate" :key="date" :label="date" :set-open="true">
        <template v-slot:meta>
            <span>{{ entries.length }} Event{{ entries.length === 1 ? '' : 's' }}</span>
        </template>
        <template v-slot:content>
            <div v-for="entry in entries" :key="entry.id">
                <AuditEntry :entry="entry"></AuditEntry>
            </div>
        </template>
    </ff-accordion>
</template>

<script>
/* eslint-disable no-template-curly-in-string */

import AuditEntry from './AuditEntry.vue'
import FFAccordion from '@/components/Accordion.vue'

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
            logEntriesByDate: null,
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
            this.groupResults(result.log)
            this.loading = false
        },
        groupResults (log) {
            let lastDate = null
            if (!this.logEntriesByDate) {
                this.logEntriesByDate = {}
            }
            log.forEach((entry) => {
                if (!entry.time) {
                    const date = new Date(entry.createdAt)
                    const strDate = date.toDateString()
                    if (strDate !== lastDate) {
                        entry.date = date.toDateString()
                        lastDate = strDate
                    }
                    entry.time = date.toLocaleTimeString()
                    entry.icon = eventIcons[entry.event] || null
                    entry.title = eventDescriptions[entry.event] || entry.event
                    entry.title = entry.title.replace(/\${user}/g, entry.username)
                    // reduce and group by date
                    if (!this.logEntriesByDate[strDate]) {
                        this.logEntriesByDate[strDate] = []
                    }
                    this.logEntriesByDate[strDate].push(entry)
                } else if (entry.date) {
                    lastDate = entry.date
                }
            })
        },
        fetchData: async function (newVal) {
            if (this.initialLoad) {
                this.loading = true
            }
            if (this.entity && this.entity.id) {
                const result = await this.loadItems(this.entity.id)
                this.groupResults(result.log)
                this.nextCursor = result.meta.next_cursor
            }
            this.initialLoad = false
            this.loading = false
        }
    },
    components: {
        'ff-accordion': FFAccordion,
        AuditEntry
    }
}
</script>

<style lang="scss">
@import "@/stylesheets/components/audit-log.scss";
@import "@/stylesheets/components/accordion.scss";
</style>
