<template>
    <SectionTopMenu hero="Shared Library" help-header="FlowForge - Library" info="Shared repository to store common flows and nodes."></SectionTopMenu>
    <div>
        <span v-for="(crumb, $index) in breadcrumbs" :key="$index">{{ crumb.name }}</span>
    </div>
    <ff-data-table :columns="columns" :rows="rows" :rows-selectable="true" @row-selected="entrySelected"></ff-data-table>
</template>

<script>
import { markRaw } from 'vue'
import teamApi from '@/api/team'

import SectionTopMenu from '@/components/SectionTopMenu'
import TypeIcon from './components/LibraryEntryTypeIcon.vue'

export default {
    name: 'SharedLibrary',
    props: ['team', 'teamMembership'],
    data () {
        return {
            breadcrumbs: [{
                name: 'Library'
            }],
            columns: [{
                key: 'type',
                label: '',
                class: ['w-2'],
                component: {
                    is: markRaw(TypeIcon)
                }
            }, {
                key: 'name',
                label: 'Name'
            }, {
                key: 'last_modified',
                label: 'Last Modified'
            }, {
                key: 'modified_by',
                label: 'Modified By'
            }],
            rows: [{
                type: 'folder',
                name: 'flows',
                last_modified: null,
                modified_by: null
            }, {
                type: 'folder',
                name: 'functions',
                last_modified: null,
                modified_by: null
            }]
        }
    },
    methods: {
        loadLibrary (fileType, parentDir) {
            return teamApi.getTeamLibrary(this.team.id, fileType, parentDir).then((library) => {
                return library
            })
        },
        entrySelected (entry) {
            if (entry.type === 'folder') {
                let fileType
                let parentDir
                console.log('entry')
                console.log(entry)
                if (entry.name === 'flows' || entry.name === 'functions') {
                    // special case of flows/functions
                    fileType = entry.name
                } else {
                    fileType = entry.type
                    parentDir = entry.name
                }
                this.loadLibrary(fileType, parentDir).then((contents) => {
                    this.breadcrumbs.push(entry)
                    this.rows = contents.map((entry) => {
                        console.log(entry)
                        if (typeof (entry) === 'string') {
                            // function entry
                            return {
                                name: entry,
                                type: 'folder'
                            }
                        } else {
                            return {
                                name: entry.fn,
                                type: 'flow'
                            }
                        }
                    })
                })
            } else {
                console.log('TODO - handle file clicking')
            }
        }
    },
    components: {
        SectionTopMenu
    }
}
</script>
