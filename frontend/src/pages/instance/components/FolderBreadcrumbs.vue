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
import breadcrumb from '../../../ui-components/components/Breadcrumb.vue'

export default {
    name: 'FolderBreadcrumbs',
    props: {
        breadcrumbs: {
            required: true,
            type: Object
        }
    },
    emits: ['clicked', 'go-back', 'selected-visibility'],
    computed: {
        breadcrumb () {
            return breadcrumb
        },
        currentDirectory () {
            return this.breadcrumbs.length > 0
                ? this.breadcrumbs[this.breadcrumbs.length - 1]
                : 'Storage'
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
                            currentDirectory: this.currentDirectory
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
                            prepend: '/data/storage',
                            isNotAvailable: true
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
