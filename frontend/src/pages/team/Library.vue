<template>
    <SectionTopMenu hero="Team Library" help-header="FlowForge - Team Library" info="Shared repository to store common flows and nodes.">
        <template v-slot:helptext>
            <p>In Node-RED you can export and import flows and functions, and save them to your Team Library.</p>
            <p>The contents of your Team Library are available across any of your projects in FlowForge.</p>
            <p>You can read more about <a href="https://nodered.org/docs/user-guide/editor/workspace/import-export" target="_blank">Import & Exporting Flows</a> in the Node-RED documentation</p>
        </template>
    </SectionTopMenu>
    <div class="ff-breadcrumbs">
        <span v-for="(crumb, $index) in breadcrumbs" :key="$index" class="flex">
            <a @click="goToFolder(crumb, $index)">{{ crumb.name }}</a>
            <ChevronRightIcon class="ff-icon"></ChevronRightIcon>
        </span>
    </div>
    <ff-data-table :columns="columns" :rows="rows">
        <template v-slot:rows>
            <ff-data-table-row v-for="row in rows" :key="row" :selectable="row.type === 'folder'" @click="entrySelected(row)">
                <ff-data-table-cell><TypeIcon :type="row.type"/></ff-data-table-cell>
                <ff-data-table-cell>{{ row.name }}</ff-data-table-cell>
            </ff-data-table-row>
        </template>
    </ff-data-table>
</template>

<script>
import { markRaw } from 'vue'
import teamApi from '@/api/team'

import { ChevronRightIcon } from '@heroicons/vue/solid'
import SectionTopMenu from '@/components/SectionTopMenu'
import TypeIcon from './components/LibraryEntryTypeIcon.vue'

export default {
    name: 'SharedLibrary',
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
            }],
            rows: []
        }
    },
    mounted () {
        this.loadLibrary().then((contents) => {
            this.rows = this.formatEntries(contents, this.breadcrumbs[0])
        })
    },
    methods: {
        loadLibrary (parentDir) {
            return teamApi.getTeamLibrary(this.team.id, parentDir).then((library) => {
                return library
            })
        },
        entrySelected (entry) {
            if (entry.type === 'folder') {
                let parentDir = ''
                this.breadcrumbs.push(entry)

                for (let i = 1; i < this.breadcrumbs.length; i++) {
                    parentDir += `${this.breadcrumbs[i].name}/`
                }

                this.loadLibrary(parentDir).then((contents) => {
                    this.rows = this.formatEntries(contents, entry)
                })
            } else {
                console.log('TODO - handle file clicking')
            }
        },
        goToFolder (entry, index) {
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
                    path: parent.path ? parent.path + '/' + name + '/' : name + '/'
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
        }
    },
    components: {
        SectionTopMenu,
        ChevronRightIcon,
        TypeIcon
    }
}
</script>
