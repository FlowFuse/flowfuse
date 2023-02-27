<template>
    <SectionTopMenu hero="Team Library" help-header="FlowForge - Team Library" info="Shared repository to store common flows and nodes.">
        <template #helptext>
            <p>In Node-RED you can export and import flows and functions, and save them to your Team Library.</p>
            <p>The contents of your Team Library are available across any of your projects in FlowForge.</p>
            <p>You can read more about <a href="https://nodered.org/docs/user-guide/editor/workspace/import-export" target="_blank">Import & Exporting Flows</a> in the Node-RED documentation</p>
        </template>
        <template #tools>
            <ff-button v-if="contents" @click="copyToClipboard()">Copy to Clipboard</ff-button>
        </template>
    </SectionTopMenu>
    <div :class="{'ff-breadcrumbs': true, 'disable-last': !viewingFile}">
        <span v-for="(crumb, $index) in breadcrumbs" :key="$index" class="flex items-center">
            <label @click="entrySelected(crumb)">{{ crumb.name }}</label>
            <ChevronRightIcon v-if="breadcrumbs.length === 1 || $index !== breadcrumbs.length - 1" class="ff-icon" />
        </span>
    </div>
    <div>
        <ff-data-table v-if="!viewingFile " :columns="columns" :rows="rows">
            <template #rows>
                <ff-data-table-row v-for="row in rows" :key="row" :selectable="true" @click="entrySelected(row)">
                    <ff-data-table-cell><TypeIcon :type="row.type" /></ff-data-table-cell>
                    <ff-data-table-cell>{{ row.name }}</ff-data-table-cell>
                    <ff-data-table-cell>{{ formatDateTime(row.updatedAt) }}</ff-data-table-cell>
                    <template #context-menu>
                        <ff-list-item class="ff-list-item--danger" label="Delete" @click.stop="deleteFile(row)" />
                    </template>
                </ff-data-table-row>
            </template>
        </ff-data-table>
        <ff-code-previewer v-else ref="code-preview" :snippet="contents" />
    </div>
</template>

<script>

import { ChevronRightIcon } from '@heroicons/vue/solid'

import TypeIcon from './components/LibraryEntryTypeIcon.vue'

import teamApi from '@/api/team'
import CodePreviewer from '@/components/CodePreviewer.vue'
import SectionTopMenu from '@/components/SectionTopMenu'
import formatDateMixin from '@/mixins/DateTime.js'
import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

export default {
    name: 'SharedLibrary',
    components: {
        SectionTopMenu,
        ChevronRightIcon,
        'ff-code-previewer': CodePreviewer,
        TypeIcon
    },
    mixins: [formatDateMixin],
    props: {
        team: { required: true, type: Object },
        teamMembership: { required: true, type: Object }
    },
    data () {
        return {
            breadcrumbs: [],
            columns: [{
                key: 'type',
                label: '',
                class: ['w-2']
            }, {
                key: 'name',
                label: 'Name'
            }, {
                key: 'updatedAt',
                label: 'Date Modified',
                class: ['w-80']
            }, {
                key: 'actions'
            }],
            rows: [],
            contents: null,
            viewingFile: false
        }
    },
    created () {
        this.$watch(
            () => this.$route.params,
            () => {
                this.pathChanged(this.$route.params.entryPath || [])
            }
        )

        this.pathChanged(this.$route.params.entryPath || [])
    },
    methods: {
        pathChanged (pathArray = []) {
            this.loadEntry(pathArray.filter((entry) => entry))
        },
        async loadEntry (entryPathArray) {
            const entryPath = entryPathArray.join('/')
            const entryIsFile = /\.\w+/.test(entryPath)

            const contents = await teamApi.getTeamLibrary(this.team.id, entryPath)

            this.breadcrumbs = [{
                name: 'Library',
                path: ''
            }]
            for (const entry of entryPathArray) {
                this.breadcrumbs.push(this.formatEntry(entry, this.breadcrumbs.at(-1)))
            }

            this.viewingFile = entryIsFile
            if (entryIsFile) {
                this.contents = contents
            } else {
                this.rows = this.formatEntries(contents || [], this.breadcrumbs.at(-1))
            }
        },
        entrySelected (entry) {
            this.$router.push({
                name: 'TeamLibrary',
                params: {
                    entryPath: entry.path.split('/')
                }
            })
        },
        formatEntry (contents, parent) {
            const type = (typeof (contents) === 'string') ? 'folder' : contents.type
            const name = (typeof (contents) === 'string') ? contents : contents.fn
            return {
                type,
                name,
                updatedAt: contents.updatedAt,
                path: parent.path ? (parent.path + '/' + name) : name
            }
        },
        formatEntries (contents, parent) {
            return contents.map((entry) => this.formatEntry(entry, parent)).sort((a, b) => {
                const typeOrder = ['folder', 'flows', 'functions']
                // folders at top
                const aType = typeOrder.indexOf(a.type)
                const bType = typeOrder.indexOf(b.type)
                const folderSort = (aType < bType) ? -1 : ((aType > bType) ? 1 : 0)
                // name sort
                const aName = a.name.toLowerCase()
                const bName = a.name.toLowerCase()
                const nameSort = (aName > bName) ? -1 : ((aName < bName) ? 1 : 0)
                // folders first, then names
                return folderSort || nameSort
            })
        },
        copyToClipboard () {
            navigator.clipboard.writeText(JSON.stringify(this.contents))
            Alerts.emit('Copied to Clipboard.', 'confirmation')
        },
        async deleteFile (file) {
            Dialog.show({
                header: 'Delete File',
                kind: 'danger',
                text: 'Are you sure you want to delete this file? Once deleted, there is no going back.',
                confirmLabel: 'Delete'
            }, async () => {
                try {
                    const filePathWithoutTrailingSlash = file.path.endsWith('/') ? file.path.slice(0, -1) : file.path
                    await teamApi.deleteFromTeamLibrary(this.team.id, filePathWithoutTrailingSlash)
                    Alerts.emit('Successfully deleted!', 'confirmation')
                } catch (err) {
                    Alerts.emit('Failed to delete device: ' + err.toString(), 'warning', 7500)
                } finally {
                    // Trigger a refresh
                    this.pathChanged(this.$route.params.entryPath || [])
                }
            })
        }
    }
}
</script>
