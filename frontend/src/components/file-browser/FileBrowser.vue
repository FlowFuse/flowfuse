<template>
    <ff-data-table
        :rows="items"
        :columns="columns"
        :show-row-checkboxes="true"
        :show-search="true"
        :rows-selectable="isRowSelectable"
        :no-data-message="`No files in '${fullPath || 'Storage'}'`"
        search-placeholder="Search Files"
        @row-selected="directoryClicked"
    >
        <template #actions>
            <!-- <DropdownMenu data-el="bulk-actions-dropdown" buttonClass="ff-btn ff-btn--secondary" :options="bulkActionsDropdownOptions">Actions</DropdownMenu> -->
            <ff-button
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
                data-action="upload-file"
                kind="primary"
                @click="uploadFile"
            >
                <template #icon-right>
                    <UploadIcon />
                </template>
                Upload
            </ff-button>
        </template>
        <template #context-menu="{row}">
            <template v-if="row.type === 'directory'">
                <ff-list-item label="Edit Folder" @click.stop="editFolder(row)" />
                <ff-list-item kind="danger" label="Delete Folder" @click.stop="deleteFolder(row)" />
            </template>
            <template v-if="row.type === 'file'">
                Hello World
            </template>
        </template>
    </ff-data-table>
    <!-- Dialog: New Folder -->
    <ff-dialog ref="new-folder" header="New Folder" :disablePrimary="!newFolder.name" @confirm="createFolder">
        <p style="margin-bottom: 12px">
            Please provide a name for the new folder.
        </p>
        <ff-text-input v-model="newFolder.name" placeholder="New Folder" />
    </ff-dialog>
    <!-- Dialog: Edit Folder -->
    <ff-dialog ref="edit-folder" header="Edit Folder" :disablePrimary="!newFolder.name" @confirm="updateFolder">
        <p style="margin-bottom: 12px">
            Please update the name for the folder.
        </p>
        <ff-text-input v-model="newFolder.name" placeholder="Folder Name" />
    </ff-dialog>
</template>

<script>

import { PlusIcon, UploadIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import AssetsAPI from '../../api/assets.js'
import Dialog from '../../services/dialog.js'

import ItemFilePath from './cells/FilePath.vue'
import ItemSize from './cells/Size.vue'
import ItemType from './cells/Type.vue'

export default {
    name: 'FileBrowser',
    components: {
        PlusIcon,
        UploadIcon
    },
    props: {
        items: {
            required: true,
            type: Object
        },
        pwd: {
            required: true,
            type: Object
        },
        breadcrumbs: {
            required: true,
            type: Object
        }
    },
    emits: ['change-directory', 'items-updated'],
    data () {
        return {
            columns: [
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
                            pwd: this.pwd.name || ''
                        }
                    }
                },
                {
                    key: 'lastModified',
                    label: 'Last Modified',
                    sortable: true
                }
            ],
            newFolder: {
                name: ''
            },
            folder: {
                name: ''
            }
        }
    },
    computed: {
        instanceId () {
            return this.$route.params.id
        },
        fullPath () {
            // clear null values
            const breadcrumbs = this.breadcrumbs.filter(n => n)
            return breadcrumbs.join('/').replace('//', '/')
        }
    },
    methods: {
        showDialog (dialog) {
            this.$refs[dialog].show()
        },
        createFolder () {
            AssetsAPI.createFolder(this.instanceId, this.fullPath, this.newFolder.name)
                .then(() => {
                    this.newFolder.name = ''
                    this.$emit('items-updated')
                })
                .catch(error => {
                    console.error(error)
                })
        },
        editFolder (folder) {
            this.folder = { ...folder }
            this.newFolder = { ...folder }
            this.$refs['edit-folder'].show()
        },
        updateFolder () {
            // existing folder name
            const uri = this.fullPath + '/' + this.folder.name
            // update to new folder name
            AssetsAPI.updateFolder(this.instanceId, uri, this.newFolder.name)
                .then(() => {
                    this.folder.name = ''
                    this.newFolder = { name: '' }
                    this.$emit('items-updated')
                })
                .catch(error => {
                    console.error(error)
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
                    const uri = this.fullPath + '/' + folder.name
                    await AssetsAPI.deleteItem(this.instanceId, uri)
                    this.$emit('items-updated')
                } catch (error) {
                    console.error(error)
                }
            })
        },
        uploadFile () {
            console.log('Upload File')
        },
        isRowSelectable (row) {
            return row.type === 'directory'
        },
        directoryClicked (row) {
            if (row.type === 'directory') {
                this.$emit('change-directory', row)
            }
        }
    }
}
</script>
