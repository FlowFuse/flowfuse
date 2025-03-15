<template>
    <ff-loading v-if="loading" message="Loading Activity..." />
    <div v-if="hasNoEntries && !loading" class="ff-no-data ff-no-data-large">
        No Activity Found
    </div>
    <ff-accordion v-for="(logEntries, date, $index) in logEntriesByDate" :key="date" :label="date" :set-open="$index < 3" data-el="accordion" :disabled="disableAccordion">
        <template #meta>
            <span>{{ logEntries.length }} Event{{ logEntries.length === 1 ? '' : 's' }}</span>
        </template>
        <template #content>
            <div v-for="entry in logEntries" :key="entry.id">
                <AuditEntry :entry="entry" :association="getAssociation(entry)" :disableAssociations="disableAssociations" />
            </div>
        </template>
    </ff-accordion>
    <div v-if="!hasNoEntries && showLoadMore !== false && nextCursor" class="px-8 py-4">
        <a v-if="!loading" class="forge-button-inline" @click.stop="loadMore">Load more...</a>
        <div v-else class="text-gray-500">Loading...</div>
    </div>
</template>

<script>
/* eslint-disable no-template-curly-in-string */

import FFAccordion from '../Accordion.vue'

import AuditEntry from './AuditEntry.vue'

export default {
    name: 'AuditLog',
    props: {
        entries: {
            type: [null, Array],
            required: true
        },
        associations: {
            // list of associations to be used to resolve the model
            type: Object,
            default: () => {}
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
        },
        disableAssociations: {
            // should the association be disabled?
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
            this.entries?.forEach((entry) => {
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
        },
        getAssociation (entry) {
            if (this.disableAssociations || !entry?.scope) {
                return null
            }
            if (entry.scope.type === 'project') {
                return this.associations?.instances?.find((instance) => instance.id === entry.scope?.id)
            } else if (entry.scope?.type === 'application') {
                return this.associations?.applications?.find((application) => application.id === entry.scope?.id)
            } else if (entry.scope?.type === 'device') {
                return this.associations?.devices?.find((device) => device.id === entry.scope?.id)
            } else if (entry.scope?.type === 'team') {
                return { name: 'This Team' }
            }
            return null
        }
    },
    components: {
        'ff-accordion': FFAccordion,
        AuditEntry
    }
}
</script>

<style lang="scss">
@import "../../stylesheets/components/audit-log.scss";
@import "../../stylesheets/components/accordion.scss";
</style>
