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

import ItemFilePath from '../../../components/file-browser/cells/FilePath.vue'
import ProjectIcon from '../../../components/icons/Projects.js'

export default {
    name: 'FolderBreadcrumbs',
    props: {
        breadcrumbs: {
            required: true,
            type: Object
        },
        currentDirectory: {
            required: true,
            type: Object
        }
    },
    emits: ['clicked', 'go-back'],
    computed: {
        rows () {
            return [
                {
                    back: '',
                    activeDirectory: 'active-directory',
                    visibility: 'asd visibility',
                    folderPath: 'asd folderPath',
                    baseUrl: 'asd baseUrl'
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
                            template: '<div :title="this.currentDirectory?.name">{{ this.currentDirectory?.name ||  "Storage"}}</div>'
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
                            template: '<div class="flex gap-2"><ProjectIcon class="ff-icon" /> Node-RED Only</div>',
                            components: { ProjectIcon },
                            inheritAttrs: false
                        })
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
        }
    }
}
</script>
