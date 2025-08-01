<template>
    <div>
        <SectionTopMenu hero="Node-RED Instances" help-header="Node-RED Instances - Running in FlowFuse" info="Hosted instances of Node-RED, owned by this application.">
            <template #pictogram>
                <img src="../../images/pictograms/instance_red.png">
            </template>
            <template #helptext>
                <p>This is a list of Node-RED instances in this Application, hosted on the same domain as FlowFuse.</p>
                <p>It will always run the latest flow deployed in Node-RED and use the latest credentials and runtime settings defined in the Projects settings.</p>
                <p>To edit an Application's flow, open the editor of the Instance.</p>
            </template>
            <template v-if="instancesAvailable" #tools>
                <ff-button
                    v-if="hasPermission('project:create')"
                    data-action="create-instance"
                    :to="{ name: 'application-create-instance' }"
                    type="anchor"
                >
                    <template #icon-left><PlusSmIcon /></template>
                    Add Instance
                </ff-button>
            </template>
        </SectionTopMenu>
        <FeatureUnavailableToTeam v-if="!instancesAvailable" />
        <div class="space-y-6">
            <ff-data-table
                v-if="instances?.length > 0"
                data-el="cloud-instances"
                :columns="cloudColumns"
                :rows="cloudRows"
                :show-search="true"
                :search="searchTerm"
                search-placeholder="Search Instances"
                :rows-selectable="true"
                @row-selected="selectedCloudRow"
            >
                <template
                    v-if="hasPermission('project:change-status')"
                    #context-menu="{row}"
                >
                    <ff-list-item
                        :disabled="row.pendingStateChange || row.running"
                        label="Start"
                        @click.stop="$emit('instance-start', row)"
                    />

                    <ff-list-item
                        :disabled="!row.notSuspended"
                        label="Restart"
                        @click.stop="$emit('instance-restart', row)"
                    />

                    <ff-list-item
                        :disabled="!row.notSuspended"
                        kind="danger"
                        label="Suspend"
                        @click.stop="$emit('instance-suspend', row)"
                    />

                    <ff-list-item
                        v-if="hasPermission('project:delete')"
                        kind="danger"
                        label="Delete"
                        @click.stop="$emit('instance-delete', row)"
                    />
                </template>
            </ff-data-table>
            <EmptyState v-else-if="instancesAvailable">
                <template #img>
                    <img src="../../images/empty-states/application-instances.png">
                </template>
                <template #header>Add your Application's First Instance</template>
                <template #message>
                    <p>
                        Applications in FlowFuse are used to manage groups of Node-RED Instances.
                    </p>
                </template>
                <template #actions>
                    <ff-button
                        v-if="hasPermission('project:create')"
                        :to="{ name: 'application-create-instance' }"
                        type="anchor"
                    >
                        <template #icon-left><PlusSmIcon /></template>
                        Add Instance
                    </ff-button>
                </template>
                <template #note>
                    <p>
                        The FlowFuse team also have more planned for Applications, including
                        <a class="ff-link" href="https://github.com/FlowFuse/flowfuse/issues/1734" target="_blank">
                            shared settings across Instances</a>.
                    </p>
                </template>
            </EmptyState>
            <EmptyState v-else>
                <template #img>
                    <img src="../../images/empty-states/application-instances.png">
                </template>
                <template #header>Hosted Instances Not Available</template>
                <template #message>
                    <p>
                        Hosted Instances are not available for this team tier. Please consider upgrading if you would like to enable this feature.
                    </p>
                </template>
            </EmptyState>
        </div>
    </div>
</template>

<script>

import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapGetters, mapState } from 'vuex'

import EmptyState from '../../components/EmptyState.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import FeatureUnavailableToTeam from '../../components/banners/FeatureUnavailableToTeam.vue'
import { useNavigationHelper } from '../../composables/NavigationHelper.js'

import permissionsMixin from '../../mixins/Permissions.js'
import { Roles } from '../../utils/roles.js'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'
import DashboardLinkCell from '../instance/components/cells/DashboardLink.vue'
import InstanceEditorLinkCell from '../instance/components/cells/InstanceEditorLink.vue'

import DeploymentName from './components/cells/DeploymentName.vue'
import LastSeen from './components/cells/LastSeen.vue'

export default {
    name: 'ProjectOverview',
    components: {
        PlusSmIcon,
        SectionTopMenu,
        EmptyState,
        FeatureUnavailableToTeam
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        application: {
            type: Object,
            required: true
        },
        instances: {
            type: Array,
            required: true
        }
    },
    emits: ['instance-delete', 'instance-suspend', 'instance-restart', 'instance-start'],
    setup () {
        const { navigateTo } = useNavigationHelper()

        return {
            navigateTo
        }
    },
    data () {
        return {
            searchTerm: ''
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        ...mapGetters('account', ['featuresCheck']),
        cloudColumns () {
            return [
                { label: 'Name', class: ['w-1/2'], component: { is: markRaw(DeploymentName) } },
                {
                    label: 'Instance Status',
                    class: ['w-1/5'],
                    instanceType: 'instance',
                    component: {
                        is: markRaw(InstanceStatusBadge),
                        map: { status: 'meta.state', instanceId: 'id' },
                        extraProps: { instanceType: 'instance' }
                    }
                },
                { label: 'Last Deployed', class: ['w-1/5'], component: { is: markRaw(LastSeen), map: { lastSeenSince: 'flowLastUpdatedSince' } } },
                { label: '', component: { is: markRaw(DashboardLinkCell), map: { instance: '_self', hidden: 'hideDashboard2Button' } } },
                { label: '', component: { is: markRaw(InstanceEditorLinkCell), map: { instance: '_self' } } }
            ]
        },
        cloudRows () {
            return this.instances.map((instance) => {
                instance.running = instance.meta?.state === 'running'
                instance.notSuspended = instance.meta?.state !== 'suspended'
                instance.isHA = instance.ha?.replicas !== undefined
                instance.disabled = !instance.running || this.isVisitingAdmin || instance.isHA
                instance._self = { ...instance }
                instance.hideDashboard2Button = !instance.settings?.dashboard2UI
                return instance
            })
        },
        isVisitingAdmin () {
            return this.teamMembership.role === Roles.Admin
        },
        instancesAvailable () {
            return this.featuresCheck?.isHostedInstancesEnabledForTeam
        }
    },
    mounted () {
        if (this.$route?.query?.searchQuery) {
            this.searchTerm = this.$route.query.searchQuery
        }
    },
    methods: {
        selectedCloudRow (cloudInstance, event) {
            this.navigateTo({
                name: 'Instance',
                params: {
                    id: cloudInstance.id
                }
            }, event)
        }
    }
}
</script>
