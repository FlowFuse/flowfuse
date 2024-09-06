<template>
    <div class="ff-breadcrumbs disable-last mb-7" data-el="folder-breadcrumbs">
        <ff-data-table
            :rows="rows"
            :columns="columns"
        />
    </div>
</template>

<script>

import { ArrowLeftIcon } from '@heroicons/vue/outline'

import { markRaw } from 'vue'

import VisibilitySelector from '../../../components/file-browser/VisibilitySelector.vue'
import ItemFilePath from '../../../components/file-browser/cells/FilePath.vue'

export default {
    name: 'FolderBreadcrumbs',
    props: {
        breadcrumbs: {
            required: true,
            type: Array
        }
    },
    emits: ['go-back', 'selected-visibility'],
    computed: {
        currentDirectory () {
            return this.breadcrumbs.length > 0
                ? this.breadcrumbs[this.breadcrumbs.length - 1]
                : null
        },
        currentDirectoryName () {
            return this.currentDirectory ? this.currentDirectory.name : 'Storage'
        },
        isCurrentDirectoryPublic () {
            if (!this.currentDirectory) {
                return false
            }

            return Object.prototype.hasOwnProperty.call(this.currentDirectory, 'share') &&
              Object.prototype.hasOwnProperty.call(this.currentDirectory.share, 'root')
        },
        folderStaticPath () {
            if (!this.isCurrentDirectoryPublic) {
                return ''
            }

            return this.currentDirectory.share.root
        },
        rows () {
            return [
                {
                    back: '',
                    activeDirectory: 'active-directory',
                    visibility: 'visibility',
                    folderPath: 'folder-path',
                    baseUrl: 'baseUrl'
                }
            ]
        },
        columns () {
            return [
                {
                    key: 'back',
                    label: '',
                    component: {
                        is: markRaw({
                            props: ['shouldDisplayBackButton'],
                            template: '<arrow-left-icon class="ff-icon cursor-pointer" @click="goBack" v-if="shouldDisplayBackButton"/>',
                            components: { ArrowLeftIcon },
                            methods: {
                                goBack: this.goBack
                            }
                        }),
                        extraProps: {
                            shouldDisplayBackButton: this.shouldDisplayTheBackButton
                        }
                    },
                    style: {
                        width: '50px'
                    }
                },
                {
                    key: 'activeDirectory',
                    label: 'Active Directory',
                    component: {
                        is: markRaw({
                            props: ['currentDirectory'],
                            template: '<div :title="this.currentDirectory">{{ this.currentDirectory }}</div>'
                        }),
                        extraProps: {
                            currentDirectory: this.currentDirectoryName
                        }
                    }
                },
                {
                    key: 'visibility',
                    label: 'Visibility',
                    component: {
                        is: markRaw({
                            template: '<VisibilitySelector :breadcrumbs="breadcrumbs" @selected="selectedVisibility"/>',
                            components: { VisibilitySelector },
                            props: ['breadcrumbs'],
                            methods: {
                                selectedVisibility: this.selectedVisibility
                            }
                        }),
                        extraProps: {
                            breadcrumbs: this.breadcrumbs
                        }
                    }
                },
                {
                    key: 'folderPath',
                    label: 'Folder Path',
                    component: {
                        is: markRaw(ItemFilePath),
                        extraProps: {
                            breadcrumbs: this.breadcrumbs,
                            prepend: '/data/storage'
                        }
                    }
                },
                {
                    key: 'baseUrl',
                    label: 'Base URL',
                    component: {
                        is: markRaw(ItemFilePath),
                        extraProps: {
                            breadcrumbs: this.breadcrumbs,
                            prepend: this.folderStaticPath,
                            isNotAvailable: !this.isCurrentDirectoryPublic
                        }
                    }
                }

            ]
        },
        shouldDisplayTheBackButton () {
            return this.breadcrumbs.length > 0
        }
    },
    methods: {
        goBack () {
            this.$emit('go-back', '')
        },
        selectedVisibility (visibility) {
            this.$emit('selected-visibility', visibility)
        }
    }
}
</script>
