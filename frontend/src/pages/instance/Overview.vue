<template>
    <div class="ff-project-overview space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <div class="ff-instance-info">
                    <FormHeading><TemplateIcon />Info</FormHeading>

                    <table class="table-fixed w-full border border-separate rounded">
                        <tr class="border-b">
                            <td class="w-40 font-medium">Editor</td>
                            <td>
                                <div v-if="editorAvailable">
                                    <div v-if="isVisitingAdmin || instance.settings.disableEditor" class="my-2">
                                        {{ instance.url }}
                                    </div>
                                    <a v-else :href="instance.url" target="_blank" class="ff-link flex" data-el="editor-link">
                                        <span class="ml-r">{{ instance.url }}</span>
                                        <ExternalLinkIcon class="w-4 ml-3" />
                                    </a>
                                </div>
                                <div v-else class="my-2">
                                    <router-link v-if="isHA" :to="{name: 'instance-settings-ha', params: { id: instance.id }}" @click.stop>
                                        <StatusBadge class="text-gray-400 hover:text-blue-600" status="high-availability" />
                                    </router-link>
                                    <template v-else>
                                        Unavailable
                                    </template>
                                </div>
                            </td>
                        </tr>
                        <tr class="border-b">
                            <td class="font-medium">Status</td>
                            <td class="py-2">
                                <InstanceStatusBadge :status="instance.meta.state" :pendingStateChange="instance.pendingStateChange" :optimisticStateChange="instance.optimisticStateChange" />
                            </td>
                        </tr>
                        <tr class="border-b">
                            <td class="font-medium">Last Updated</td>
                            <td class="py-2">
                                <template v-if="instance.flowLastUpdatedSince">
                                    {{ instance.flowLastUpdatedSince }}
                                </template>
                                <span v-else class="text-gray-400 italic">
                                    flows never deployed
                                </span>
                            </td>
                        </tr>

                        <tr class="border-b">
                            <td class="font-medium">Security</td>
                            <td class="py-2">
                                <div class="flex">
                                    <template v-if="instance.settings.httpNodeAuth">
                                        <template v-if="instance.settings.httpNodeAuth.type == 'basic'">
                                            HTTP basic authentication
                                        </template>
                                        <template v-else-if="instance.settings.httpNodeAuth.type == 'flowforge-user'">
                                            FlowFuse User Authentication
                                        </template>
                                        <template v-else>
                                            None
                                        </template>
                                    </template>
                                    <span v-else>
                                        None
                                    </span>
                                    <router-link class="mt-0.5 ml-3" :to="{ name: 'instance-settings-security' }"><LinkIcon class="w-4" /></router-link>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="ff-instance-info">
                    <FormHeading><ServerIcon />Specs</FormHeading>

                    <table class="table-fixed w-full">
                        <tr class="border-b">
                            <td class="w-48 font-medium">Type</td>
                            <td class="flex items-center">
                                <div class="py-2 flex-grow">{{ instance.projectType?.name || 'none' }} / {{ instance.stack?.label || instance.stack?.name || 'none' }}</div>
                                <div v-if="instance.stack?.replacedBy">
                                    <ff-button size="small" to="./settings/general">Update</ff-button>
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
            </div>
            <div class="ff-instance-info">
                <FormHeading><TrendingUpIcon />Recent Activity</FormHeading>
                <AuditLog :entries="auditLog" :showLoadMore="false" :disableAccordion="true" />
                <div class="pb-4 text-center">
                    <router-link to="./audit-log" class="forge-button-inline">More...</router-link>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ExternalLinkIcon, LinkIcon, ServerIcon, TemplateIcon, TrendingUpIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

import InstanceApi from '../../api/instances.js'
import FormHeading from '../../components/FormHeading.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import AuditLog from '../../components/audit-log/AuditLog.vue'
import permissionsMixin from '../../mixins/Permissions.js'

import InstanceStatusBadge from './components/InstanceStatusBadge.vue'

export default {
    name: 'InstanceOverview',
    components: {
        AuditLog,
        ExternalLinkIcon,
        FormHeading,
        InstanceStatusBadge,
        LinkIcon,
        ServerIcon,
        StatusBadge,
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
    data () {
        return {
            auditLog: []
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        instanceRunning () {
            return this.instance?.meta?.state === 'running'
        },
        editorAvailable () {
            return !this.isHA && this.instanceRunning
        },
        isHA () {
            return this.instance?.ha?.replicas !== undefined
        }
    },
    watch: {
        'instance.id': function (old, news) {
            this.loadLogs()
        }
    },
    mounted () {
        this.loadLogs()
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
@import "../../stylesheets/pages/project.scss";
</style>
