<template>
    <!-- set mb-14 (~56px) on the form to permit access to kebab actions where hubspot chat covers it -->
    <div class="ff-team-library mb-14">
        <div v-if="isSharedLibraryFeatureEnabled" class="breadcrumbs-wrapper">
            <div :class="{'ff-breadcrumbs': true, 'disable-last': !viewingFile}">
                <span v-for="(crumb, $index) in breadcrumbs" :key="$index" class="flex items-center">
                    <label @click="entrySelected(crumb)">{{ crumb.name }}</label>
                    <ChevronRightIcon v-if="breadcrumbs.length === 1 || $index !== breadcrumbs.length - 1" class="ff-icon" />
                </span>
            </div>
            <ff-button v-if="file?.contents" kind="secondary" size="small" @click="copyToClipboard()">Copy to Clipboard</ff-button>
        </div>
        <ff-data-table v-if="!viewingFile && rows.length > 0" :columns="columns" :rows="rows">
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
        <!-- file viewer -->
        <ff-flow-viewer v-else-if="viewingFile && file.meta.type === 'flows'" :flow="file?.contents" />
        <ff-code-previewer v-else-if="viewingFile && file.meta.type === 'functions'" ref="code-preview" :snippet="file?.contents" />
        <EmptyState v-else :featureUnavailable="!isSharedLibraryFeatureEnabledForPlatform" :featureUnavailableToTeam="!isSharedLibraryFeatureEnabledForTeam">
            <template #img>
                <img src="../../../images/empty-states/team-library.png" alt="team-logo">
            </template>
            <template #header>Create your own Team Library</template>
            <template #message>
                <p>
                    You can import and export flows and functions to a shared <a class="ff-link" href="https://flowfuse.com/docs/user/shared-library/" target="_blank">Team Library</a> from within your Node-RED Instances.
                </p>
                <p>
                    The contents of your Team Library will show here, and will be available within all of your Node-RED instances on FlowFuse.
                </p>
            </template>
            <template #actions>
                <ff-button v-if="isSharedLibraryFeatureEnabled" :to="{name: 'Instances'}" data-el="go-to-instances">Go To Instances</ff-button>
                <ff-button v-else :to="{name: 'Instances'}" :disabled="true">
                    Add To Library
                    <template #icon-right><PlusIcon /></template>
                </ff-button>
            </template>
            <template #note>
                <p>
                    You can see a video of how to get started with this feature <a class="ff-link" href="https://www.youtube.com/watch?v=B7XK3TUklUU" target="_blank">here</a>.
                </p>
            </template>
        </EmptyState>
    </div>
</template>

<script>
import { ChevronRightIcon, PlusIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import teamApi from '../../../api/team.js'

import CodePreviewer from '../../../components/CodePreviewer.vue'
import EmptyState from '../../../components/EmptyState.vue'
import FlowViewer from '../../../components/flow-viewer/FlowViewer.vue'
import formatDateMixin from '../../../mixins/DateTime.js'
import featuresMixin from '../../../mixins/Features.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'
import TypeIcon from '../components/LibraryEntryTypeIcon.vue'

export default {
    name: 'TeamLibrary',
    components: {
        'ff-code-previewer': CodePreviewer,
        'ff-flow-viewer': FlowViewer,
        ChevronRightIcon,
        EmptyState,
        TypeIcon,
        PlusIcon
    },
    mixins: [formatDateMixin, featuresMixin],
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
            file: {
                meta: null,
                contents: null
            },
            viewingFile: false
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership'])
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
        entrySelected (entry) {
            this.$router.push({
                name: 'LibraryTeamLibrary',
                params: {
                    entryPath: entry.path.split('/')
                }
            })
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
        },
        pathChanged (pathArray = []) {
            this.loadEntry(pathArray.filter((entry) => entry))
        },
        async loadEntry (entryPathArray) {
            if (!this.isSharedLibraryFeatureEnabled) {
                return
            }

            const entryPath = entryPathArray.join('/')
            const { meta, data: content } = await teamApi.getTeamLibrary(this.team.id, entryPath)

            this.breadcrumbs = [{
                name: 'Library',
                path: ''
            }]
            for (const entry of entryPathArray) {
                this.breadcrumbs.push(this.formatEntry(entry, this.breadcrumbs.at(-1)))
            }

            this.viewingFile = meta.type !== 'folder'
            if (this.viewingFile) {
                this.file.meta = meta
                this.file.contents = content
            } else {
                // clear selection so that copy to clipboard is hidden
                this.file.meta = null
                this.file.contents = null
                this.rows = this.formatEntries(content, this.breadcrumbs.at(-1))
            }
        },
        formatEntry (contents, parent) {
            const type = (typeof (contents) === 'string') ? 'folder' : contents.type
            const name = (typeof (contents) === 'string') ? contents : contents.fn
            return {
                type,
                name,
                updatedAt: contents.updatedAt || 0, // directory listings do not have an updatedAt
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
                const aName = a.name?.toLowerCase()
                const bName = b.name?.toLowerCase()
                const nameSort = (aName > bName) ? -1 : ((aName < bName) ? 1 : 0)
                // folders first, then names
                return folderSort || nameSort
            })
        },
        copyToClipboard () {
            navigator.clipboard.writeText(JSON.stringify(this.file.contents))
            Alerts.emit('Copied to Clipboard.', 'confirmation')
        }
    }
}
</script>

<style scoped lang="scss">
.ff-team-library .ff-breadcrumbs {
    margin-top: 12px;
    margin-bottom: 12px;
}
.breadcrumbs-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
