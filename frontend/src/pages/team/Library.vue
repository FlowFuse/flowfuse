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
    <div class="ff-breadcrumbs">
        <span v-for="(crumb, $index) in breadcrumbs" :key="$index" class="flex">
            <label @click="goToFolder(crumb, $index)">{{ crumb.name }}</label>
            <ChevronRightIcon class="ff-icon" />
        </span>
    </div>
    <div>
        <ff-data-table v-if="!contents" :columns="columns" :rows="rows">
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
    props: ['team', 'teamMembership'],
    data () {
        return {
            breadcrumbs: [{
                name: 'Library',
                path: ''
            }],
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
            contents: null
        }
    },
    mounted () {
        this.loadTable()
    },
    methods: {
        loadTable () {
            this.loadLibrary().then((contents) => {
                this.rows = this.formatEntries(contents, this.breadcrumbs[0])
            })
        },
        loadLibrary (parentDir) {
            return teamApi.getTeamLibrary(this.team.id, parentDir).then((library) => {
                return library
            })
        },
        entrySelected (entry) {
            let parentDir = ''
            this.breadcrumbs.push(entry)

            for (let i = 1; i < this.breadcrumbs.length; i++) {
                parentDir += `${this.breadcrumbs[i].name}/`
            }

            if (entry.type === 'folder') {
                this.loadLibrary(parentDir).then((contents) => {
                    this.rows = this.formatEntries(contents, entry)
                })
            } else {
                const filepath = parentDir.substring(0, parentDir.length - 1)
                this.loadLibrary(filepath).then((contents) => {
                    this.contents = contents
                })
            }
        },
        goToFolder (entry, index) {
            this.contents = null
            this.loadLibrary(entry.path).then((contents) => {
                this.rows = this.formatEntries(contents, this.breadcrumbs[0])
                this.breadcrumbs = this.breadcrumbs.slice(0, index + 1)
            })
        },
        formatEntries (contents, parent) {
            return contents.map((entry) => {
                const type = (typeof (entry) === 'string') ? 'folder' : entry.type
                const name = (typeof (entry) === 'string') ? entry : entry.fn
                return {
                    type,
                    name,
                    updatedAt: entry.updatedAt,
                    path: parent.path ? (parent.path + name + '/') : name + '/'
                }
            }).sort((a, b) => {
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
                    const response = await teamApi.deleteFromTeamLibrary(this.team.id, file.name, file.type)
                    const deletedCount = response.data.deleteCount
                    Alerts.emit(`Successfully deleted ${deletedCount} file${deletedCount > 1 ? 's' : ''}.`, 'confirmation')
                } catch (err) {
                    Alerts.emit('Failed to delete device: ' + err.toString(), 'warning', 7500)
                } finally {
                    this.loadTable()
                }
            })
        }
    }
}
</script>
