<template>
    <ff-data-table
        :rows="items"
        :columns="columns"
        :show-row-checkboxes="true"
        :show-search="true"
        :rows-selectable="isRowSelectable"
        :no-data-message="noDataMessages"
        search-placeholder="Search Files"
        :loading="loading"
        :disabled="disabled"
        loading-message="Loading directory..."
        data-el="files-table"
        @row-selected="directoryClicked"
    >
        <template #actions>
            <!-- <DropdownMenu data-el="bulk-actions-dropdown" buttonClass="ff-btn ff-btn--secondary" :options="bulkActionsDropdownOptions">Actions</DropdownMenu> -->
            <ff-button
                data-action="refresh-items"
                :disabled="disabled"
                kind="secondary"
                @click="$emit('items-updated')"
            >
                <template #icon-right>
                    <RefreshIcon />
                </template>
                Refresh
            </ff-button>
            <ff-button
                :disabled="disabled"
                data-action="add-folder"
                kind="secondary"
                @click="showDialog('new-folder')"
            >
                <template #icon-right>
                    <PlusIcon />
                </template>
                New Folder
            </ff-button>
            <ff-button
                :disabled="disabled"
                data-action="upload-file"
                kind="primary"
                @click="showDialog('upload-file')"
            >
                <template #icon-right>
                    <UploadIcon />
                </template>
                Upload
            </ff-button>
        </template>
        <template #context-menu="{row}">
            <template v-if="row.type === 'directory'">
                <ff-list-item label="Edit Folder" data-action="edit-folder" @click.stop="editFolder(row)" />
                <ff-list-item kind="danger" data-action="delete-folder" label="Delete Folder" @click.stop="deleteFolder(row)" />
            </template>
            <template v-if="row.type === 'file'">
                <ff-list-item kind="danger" data-action="delete-file" label="Delete File" @click.stop="deleteFile(row)" />
            </template>
        </template>
    </ff-data-table>
    <!-- Dialog: New Folder -->
    <ff-dialog
        ref="new-folder" data-el="new-folder-dialog" header="New Folder"
        :disablePrimary="!forms.newFolder.name"
        @confirm="createFolder" @cancel="cleanupModal('createFolder')"
    >
        <p style="margin-bottom: 12px">
            Please provide a name for the new folder.
        </p>
        <ff-text-input v-model="forms.newFolder.name" placeholder="New Folder" />
    </ff-dialog>
    <!-- Dialog: Edit Folder -->
    <ff-dialog ref="edit-folder" data-el="edit-folder-dialog" header="Edit Folder" :disablePrimary="!forms.newFolder.name" @confirm="updateFolder">
        <p style="margin-bottom: 12px">
            Please update the name for the folder.
        </p>
        <ff-text-input v-model="forms.newFolder.name" placeholder="Folder Name" />
    </ff-dialog>
    <!-- Dialog: Upload File -->
    <ff-dialog
        ref="upload-file" data-el="upload-file-dialog" header="Upload File"
        :disablePrimary="!forms.file"
        @cancel="cleanupModal('uploadFile')"
        @confirm="uploadFile"
    >
        <p style="margin-bottom: 12px">
            Please select a file to upload (max 5mb).
        </p>
        <ff-file-upload ref="fileUpload" v-model="forms.file" />
    </ff-dialog>
</template>

<script>

import { PlusIcon, RefreshIcon, UploadIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import AssetsAPI from '../../api/assets.js'
import FFFileUpload from '../../components/FileUpload.vue'

import Alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'

import ItemSize from '../FileSize.vue'

import ItemFilePath from './cells/FilePath.vue'
import ItemType from './cells/Type.vue'

export default {
    name: 'FileBrowser',
    components: {
        PlusIcon,
        RefreshIcon,
        UploadIcon,
        'ff-file-upload': FFFileUpload
    },
    props: {
        items: {
            required: true,
            type: Object
        },
        folder: {
            required: true,
            type: Object
        },
        breadcrumbs: {
            required: true,
            type: Object
        },
        disabled: {
            required: false,
            default: false,
            type: Boolean
        },
        noDataMessage: {
            required: false,
            default: '',
            type: String
        }
    },
    emits: ['change-directory', 'items-updated'],
    data () {
        return {
            loading: false,
            forms: {
                file: null,
                newFolder: {
                    name: ''
                },
                folder: {
                    name: ''
                }
            }
        }
    },
    computed: {
        instanceId () {
            return this.$route.params.id
        },
        pwd () {
            return [...this.breadcrumbs, this.folder.name].filter(b => b).join('/').replace('//', '/')
        },
        baseURI () {
            // clear null values
            const breadcrumbs = this.breadcrumbs.filter(n => n)
            return breadcrumbs.join('/').replace('//', '/')
        },
        columns () {
            return [
                {
                    key: 'type',
                    label: '',
                    sortable: true,
                    component: { is: markRaw(ItemType) },
                    style: {
                        width: '32px'
                    }
                },
                {
                    key: 'name',
                    label: 'Name',
                    sortable: true
                },
                {
                    key: 'size',
                    label: 'Size',
                    sortable: true,
                    component: { is: markRaw(ItemSize) }
                },
                {
                    key: 'filepath',
                    label: 'File Path',
                    sortable: true,
                    component: {
                        is: markRaw(ItemFilePath),
                        extraProps: {
                            breadcrumbs: this.breadcrumbs,
                            folder: this.folder.name || ''
                        }
                    }
                },
                {
                    key: 'lastModified',
                    label: 'Last Modified',
                    sortable: true
                }
            ]
        },
        noDataMessages () {
            return this.noDataMessage.length ? this.noDataMessage : `No files in '${this.folder.name || 'Storage'}'`
        }
    },
    methods: {
        showDialog (dialog) {
            this.$refs[dialog].show()
        },
        createFolder () {
            const pwd = this.baseURI + '/' + (this.folder.name || '')
            this.loading = true
            AssetsAPI.createFolder(this.instanceId, pwd, this.forms.newFolder.name)
                .then(() => this.$emit('items-updated'))
                .catch(error => {
                    console.error(error)
                    Alerts.emit(error.response.data.error, 'warning')
                })
                .finally(() => {
                    this.forms.newFolder.name = ''
                    this.loading = false
                })
        },
        editFolder (folder) {
            this.forms.folder = { ...folder }
            this.forms.newFolder = { ...folder }
            this.$refs['edit-folder'].show()
        },
        updateFolder () {
            // existing folder name
            const pwd = this.pwd
            // update to new folder name
            AssetsAPI.updateFolder(this.instanceId, pwd, this.forms.folder.name, this.forms.newFolder.name)
                .then(() => {
                    this.forms.folder.name = ''
                    this.forms.newFolder = { name: '' }
                    this.$emit('items-updated')
                })
                .catch(error => {
                    console.error(error)
                    Alerts.emit(error.response.data.error, 'warning')
                })
                .finally(() => {
                    this.loading = false
                })
        },
        deleteFolder (folder) {
            Dialog.show({
                header: 'Delete Folder',
                kind: 'danger',
                text: 'Are you sure you want to delete this folder? All of this folder\'s contents will be removed too. Once deleted, there is no going back.',
                confirmLabel: 'Delete'
            }, async () => {
                try {
                    this.loading = true
                    const uri = this.baseURI + '/' + folder.name
                    await AssetsAPI.deleteItem(this.instanceId, uri)
                    this.$emit('items-updated')
                } catch (error) {
                    console.error(error)
                    Alerts.emit(error.response.data.error, 'warning')
                } finally {
                    this.loading = false
                }
            })
        },
        deleteFile (file) {
            Dialog.show({
                header: 'Delete File',
                kind: 'danger',
                text: 'Are you sure you want to delete this file? Once deleted, there is no going back.',
                confirmLabel: 'Delete'
            }, async () => {
                try {
                    this.loading = true
                    const uri = this.pwd + '/' + file.name
                    await AssetsAPI.deleteItem(this.instanceId, uri)
                    this.$emit('items-updated')
                } catch (error) {
                    console.error(error)
                    Alerts.emit(error.response.data.error, 'warning')
                } finally {
                    this.loading = false
                }
            })
        },
        uploadFile () {
            const pwd = this.baseURI + '/' + (this.folder.name || '')
            const filename = this.forms.file.name
            this.loading = true
            AssetsAPI.uploadFile(this.instanceId, pwd, filename, this.forms.file)
                .then(() => this.$emit('items-updated'))
                .catch(error => {
                    console.error(error)
                    Alerts.emit(error.response.data.error, 'warning')
                })
                .finally(() => {
                    this.forms.file = null
                    this.$refs.fileUpload.clear()
                    this.loading = false
                })
        },
        isRowSelectable (row) {
            return row.type === 'directory'
        },
        directoryClicked (row) {
            if (row.type === 'directory') {
                this.$emit('change-directory', row)
            }
        },
        cleanupModal (action) {
            switch (action) {
            case 'createFolder':
                this.forms.newFolder.name = ''
                break
            case 'uploadFile':
                this.$refs.fileUpload.clear()
                break
            default:
            }
        }
    }
}
</script>
