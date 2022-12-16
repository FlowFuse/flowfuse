<template>
    <ff-loading v-if="loading" message="Loading Activity..." />
    <div v-if="hasNoEntries && !loading" class="ff-no-data">
        No Activity Found
    </div>
    <ff-accordion v-for="(entries, date) in logEntriesByDate" :key="date" :label="date" :set-open="true" data-el="accordion" :disabled="disableAccordion">
        <template v-slot:meta>
            <span>{{ entries.length }} Event{{ entries.length === 1 ? '' : 's' }}</span>
        </template>
        <template v-slot:content>
            <div v-for="entry in entries" :key="entry.id">
                <AuditEntry :entry="entry"></AuditEntry>
            </div>
        </template>
    </ff-accordion>
    <div v-if="!hasNoEntries && showLoadMore !== false && nextCursor" class="px-8 py-4">
        <a v-if="!loading" @click.stop="loadMore" class="forge-button-inline">Load more...</a>
        <div class="text-gray-500" v-else>Loading...</div>
    </div>
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
    props: {
        entries: {
            type: [null, Array],
            required: true
        },
        showLoadMore: {
            // do we show the "Show More" button at the end of the log
            type: Boolean,
            default: true
        },
        disableAccordion: {
            // should the accordion functionality be disabled?
            type: Boolean,
            default: false
        }
    },
    emits: ['load-more'],
    computed: {
        hasNoEntries () {
            return Object.keys(this.logEntriesByDate).length === 0
        },
        logEntriesByDate () {
            const grouped = {}
            let lastDate = null
            this.entries.forEach((entry) => {
                const date = new Date(entry.createdAt)
                const strDate = date.toDateString()
                // reduce and group by date
                if (!grouped[strDate]) {
                    grouped[strDate] = []
                }
                if (strDate !== lastDate) {
                    entry.date = date.toDateString()
                    lastDate = strDate
                }
                if (!entry.time) {
                    entry.time = date.toLocaleTimeString()
                    entry.icon = eventIcons[entry.event] || null
                    entry.title = eventDescriptions[entry.event] || entry.event
                    entry.title = entry.title.replace(/\${user}/g, entry.username)
                } else if (entry.date) {
                    lastDate = entry.date
                }
                grouped[strDate].push(entry)
            })
            return grouped
        }
    },
    data () {
        return {
            loading: false,
            nextCursor: false // TODO: drive this properly through pagination
        }
    },
    methods: {
        loadMore: async function () {
            this.$emit('load-more')
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
