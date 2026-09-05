<template>
    <SectionTopMenu :hero="$t('ui.nodeRedLogs')" :help-header="$t('ui.flowfuseNodeRedLogs')" :info="$t('ui.liveLogsFromYourFlowfuseInstancesOfNodeRed')">
        <template #helptext>
            <p>{{ $t('ui.thisIsARawFeedFromTheRunningInstanceOfNodeRedOnT') }}</p>
            <p>{{ $t('ui.useThisToDebugIssuesIfYourApplicationWillNotStar') }}</p>
        </template>
        <template #tools>
            <div style="display: flex;align-items: center;">
                <div class="mr-2"><strong>{{ $t('ui.instance') }}</strong></div>
                <ff-listbox
                    ref="dropdown"
                    v-model="input.instanceId"
                    :options="instances"
                    label-key="name"
                    value-key="id"
                    class="w-full"
                />
                <router-link v-if="instance?.meta" :to="{ name: 'instance', params: { id: instance.id }}">
                    <InstanceStatusBadge :status="instance.meta?.state" :pendingStateChange="instance?.pendingStateChange" :optimisticStateChange="instance.optimisticStateChange" class="ml-2" />
                </router-link>
            </div>
        </template>
    </SectionTopMenu>

    <LogsShared v-if="instance?.id" :instance="instance" />
    <div v-else class="ff-no-data ff-no-data-large">
        {{ $t('ui.selectAnInstanceToViewLiveLogs') }}
    </div>
</template>

<script>
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import LogsShared from '../instance/components/InstanceLogs.vue'

import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'

export default {
    name: 'ProjectLogs',
    components: {
        LogsShared,
        SectionTopMenu,
        InstanceStatusBadge
    },
    inheritAttrs: false,
    props: {
        instances: {
            type: Array,
            required: true
        }
    },
    data () {
        return {
            input: {
                instanceId: this.instances[0]?.id
            }
        }
    },
    computed: {
        instance () {
            return this.instances.find((instance) => instance.id === this.input.instanceId)
        }
    },
    watch: {
        instances: 'selectFirstInstance'
    },
    mounted () {
        this.selectFirstInstance()
    },
    methods: {
        selectFirstInstance () {
            this.input.instanceId = this.instances[0]?.id
        }
    }
}
</script>
