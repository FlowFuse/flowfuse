<template>
    <SectionTopMenu hero="Node-RED Logs" help-header="FlowForge - Node-RED Logs" info="Live logs from your FlowForge instances of Node-RED">
        <template #helptext>
            <p>This is a raw feed from the running instance of Node-RED on this domain.</p>
            <p>Use this to debug issues if your application will not start correctly.</p>
        </template>
        <template #tools>
            <div style="display: flex;align-items: center;">
                <div class="mr-2"><strong>Instance:</strong></div>
                <ff-dropdown ref="dropdown" v-model="input.instanceId" class="w-full">
                    <ff-dropdown-option
                        v-for="inputInstance in input.instances" :key="inputInstance.id"
                        :label="inputInstance.name" :value="inputInstance.id"
                    />
                </ff-dropdown>
                <router-link v-if="instance.id" :to="{ name: 'Instance', params: { id: instance.id }}">
                    <InstanceStatusBadge :status="instance.meta?.state" :pendingStateChange="instance.pendingStateChange" class="ml-2" />
                </router-link>
            </div>
        </template>
    </SectionTopMenu>
    <LogsShared :instance="instance" />
</template>

<script>
import SectionTopMenu from '../../components/SectionTopMenu'
import LogsShared from '../instance/components/InstanceLogs'

import InstanceStatusBadge from '../instance/components/InstanceStatusBadge'

import ProjectApi from '@/api/project'

export default {
    name: 'ProjectLogs',
    components: {
        LogsShared,
        SectionTopMenu,
        InstanceStatusBadge
    },
    inheritAttrs: false,
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['project-enable-polling', 'project-disable-polling'],
    data () {
        return {
            input: {
                instances: [],
                instanceId: this.project.id
            }
        }
    },
    computed: {
        instance () {
            return this.input.instances.find((instance) => instance.id === this.input.instanceId) || this.project
        }
    },
    watch: {
        project: 'projectChanged'
    },
    created () {
        this.projectChanged()
    },
    mounted () {
        this.$emit('project-enable-polling')
    },
    unmounted () {
        this.$emit('project-disable-polling')
    },
    methods: {
        projectChanged () {
            if (this.project.id) {
                this.input.instanceId = this.project.id
                this.loadInstances()
            }
        },
        async loadInstances () {
            this.input.instances = await ProjectApi.getProjectInstances(this.project.id)
        }
    }
}
</script>
