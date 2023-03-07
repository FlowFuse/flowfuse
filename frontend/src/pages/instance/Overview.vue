<template>
    <div class="ff-project-overview space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="border rounded p-4">
                <FormHeading><TemplateIcon class="w-6 h-6 mr-2 inline text-gray-400" />Overview</FormHeading>

                <table class="table-fixed w-full">
                    <tr class="border-b">
                        <td class="w-1/4 font-medium">Editor</td>
                        <td>
                            <div v-if="editorAvailable">
                                <div v-if="isVisitingAdmin" class="my-2">
                                    {{ instance.url }}
                                </div>
                                <a v-else :href="instance.url" target="_blank" class="forge-button-secondary py-1 mb-1" data-el="editor-link">
                                    <span class="ml-r">{{ instance.url }}</span>
                                    <ExternalLinkIcon class="w-4 ml-3" />
                                </a>
                            </div>
                            <div v-else class="my-2">Unavailable</div>
                        </td>
                    </tr>
                    <tr class="border-b">
                        <td class="font-medium">Status</td>
                        <td><div class="py-2"><InstanceStatusBadge :status="instance.meta?.state" :pendingStateChange="instance.pendingStateChange" /></div></td>
                    </tr>
                    <tr class="border-b">
                        <td class="font-medium">Type</td>
                        <td class="flex items-center">
                            <div class="py-2 flex-grow">{{ instance.projectType?.name || 'none' }} / {{ instance.stack?.label || instance.stack?.name || 'none' }}</div>
                            <div v-if="instance.stack?.replacedBy">
                                <ff-button size="small" to="./settings/danger">Update</ff-button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="instance.template?.name" class="border-b">
                        <td class="font-medium">Template</td>
                        <td><div class="py-2">{{ instance.template?.name }}</div></td>
                    </tr>
                    <template v-if="instance.meta?.versions">
                        <tr class="border-b">
                            <td class="font-medium">Node-RED Version</td>
                            <td><div class="py-2">{{ instance.meta.versions['node-red'] }}</div></td>
                        </tr>
                        <tr class="border-b">
                            <td class="font-medium">Launcher Version</td>
                            <td><div class="py-2">{{ instance.meta.versions.launcher }}</div></td>
                        </tr>
                        <tr class="border-b">
                            <td class="font-medium">Node.js Version</td>
                            <td><div class="py-2">{{ instance.meta.versions.node }}</div></td>
                        </tr>
                    </template>
                </table>
            </div>
            <div class="border rounded p-4">
                <FormHeading><TrendingUpIcon class="w-6 h-6 mr-2 inline text-gray-400" />Recent Activity</FormHeading>
                <AuditLog :entries="auditLog" :showLoadMore="false" :disableAccordion="true" />
                <div class="pb-4">
                    <router-link to="./activity" class="forge-button-inline">More...</router-link>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ExternalLinkIcon, TemplateIcon, TrendingUpIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

import InstanceStatusBadge from './components/InstanceStatusBadge'

import InstanceApi from '@/api/instances'
import FormHeading from '@/components/FormHeading'
import AuditLog from '@/components/audit-log/AuditLog'
import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'InstanceOverview',
    components: {
        AuditLog,
        ExternalLinkIcon,
        FormHeading,
        InstanceStatusBadge,
        TemplateIcon,
        TrendingUpIcon
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        },
        isVisitingAdmin: {
            required: true,
            type: Boolean
        }
    },
    emits: ['instance-overview-exit', 'instance-overview-enter'],
    data () {
        return {
            auditLog: []
        }
    },
    computed: {
        ...mapState('account', ['teamMembership']),
        instanceRunning () {
            return this.instance?.meta?.state === 'running'
        },
        editorAvailable () {
            return this.instanceRunning
        }
    },
    watch: {
        instance: function () {
            this.loadLogs()
        }
    },
    mounted () {
        this.$emit('instance-overview-enter')
        this.loadLogs()
    },
    unmounted () {
        this.$emit('instance-overview-exit')
    },
    methods: {
        loadLogs () {
            if (this.instance && this.instance.id) {
                this.loadItems(this.instance.id).then((data) => {
                    this.auditLog = data.log
                })
            }
        },
        loadItems: async function (instanceId, cursor) {
            return await InstanceApi.getInstanceAuditLog(instanceId, null, cursor, 4)
        }
    }
}
</script>

<style lang="scss">
@import "@/stylesheets/pages/project.scss";
</style>
