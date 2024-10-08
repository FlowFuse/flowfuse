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
        },
        instance: {
            required: true,
            type: Object
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
                            template: '<span data-action="navigate-back"><arrow-left-icon class="ff-icon cursor-pointer" @click="goBack" v-if="shouldDisplayBackButton"/></span>',
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
                    },
                    style: {
                        width: '200px'
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
                            breadcrumbs: this.breadcrumbs,
                            instance: this.instance
                        }
                    },
                    style: {
                        width: '200px'
                    }
                },
                {
                    key: 'folderPath',
                    label: 'Folder Path',
                    component: {
                        is: markRaw(ItemFilePath),
                        extraProps: {
                            breadcrumbs: this.breadcrumbs,
                            isNotAvailable: !this.isInstanceRunning,
                            type: 'folder'
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
                            isNotAvailable: !this.isCurrentDirectoryPublic || !this.isInstanceRunning,
                            baseURL: this.instance?.url,
                            type: 'url'
                        }
                    }
                }

            ]
        },
        isInstanceRunning () {
            return this.instance?.meta?.state === 'running'
        },
        shouldDisplayTheBackButton () {
            if (!this.isInstanceRunning) {
                return false
            }

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
