<template>
    <ff-data-table
        :rows="items"
        :columns="columns"
        :show-row-checkboxes="true"
        :show-search="true"
        :rows-selectable="isRowSelectable"
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
    </ff-data-table>
    <ff-dialog ref="new-folder" header="New Folder" :disablePrimary="!newFolder.name" @confirm="createFolder">
        <p style="margin-bottom: 12px">
            Please provide a name for the new folder.
        </p>
        <ff-text-input v-model="newFolder.name" placeholder="New Folder" />
    </ff-dialog>
</template>

<script>

import { PlusIcon, UploadIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import AssetsAPI from '../../api/assets.js'

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
            }
        }
    },
    computed: {
        instanceId () {
            return this.$route.params.id
        }
    },
    mounted () {
        console.log('FileBrowser mounted')
    },
    methods: {
        showDialog (dialog) {
            this.$refs[dialog].show()
        },
        createFolder () {
            console.log('Create Folder')
            AssetsAPI.createFolder(this.instanceId, this.pwd.name, this.newFolder.name)
                .then(() => {
                    console.log('Folder created')
                    this.$emit('items-updated')
                })
                .catch(error => {
                    console.log(error)
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
