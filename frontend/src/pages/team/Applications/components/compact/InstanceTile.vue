<template>
    <div class="instance-tile">
        <div class="status">
            <InstanceStatusBadge
                :status="localInstance.meta.state"
                text=""
                :pendingStateChange="localInstance.pendingStateChange"
                :optimisticStateChange="localInstance.optimisticStateChange"
            />
        </div>
        <div class="details">
            <span :title="localInstance.name" class="cursor-pointer" @click="openInstance">{{ localInstance.name }}</span>
            <a :href="localInstance.url" target="_blank" @click.stop>
                {{ localInstance.url }}
            </a>
        </div>
        <div class="actions">
            <DashboardLink
                v-if="instance.settings?.dashboard2UI"
                :instance="instance"
                :disabled="!editorAvailable"
                :show-external-link="false"
            >
                <ChartPieIcon class="ff-icon" />
            </DashboardLink>

            <InstanceEditorLink
                v-if="!localInstance.ha?.replicas !== undefined"
                :disabled="!isInstanceRunning"
                :editorDisabled="!!(localInstance.settings?.disableEditor)"
                :url="instance.url"
                :instance="instance"
            >
                <ff-button kind="secondary" data-action="open-editor" class="whitespace-nowrap" :disabled="!isInstanceRunning">
                    <ProjectIcon class="ff-btn--icon ff-icon" />
                </ff-button>
            </InstanceEditorLink>

            <ff-kebab-menu @click.stop>
                <ff-list-item
                    :disabled="localInstance.pendingStateChange || instanceRunning "
                    label="Start"
                    @click.stop="instanceStart(localInstance)"
                />
                <ff-list-item
                    :disabled="instanceSuspended"
                    label="Restart"
                    @click.stop="instanceRestart(localInstance)"
                />
                <ff-list-item
                    :disabled="instanceSuspended"
                    kind="danger"
                    label="Suspend"
                    @click.stop="instanceShowConfirmSuspend(localInstance)"
                />
                <ff-list-item
                    v-if="hasPermission('project:delete')"
                    kind="danger"
                    label="Delete"
                    @click.stop="$emit('delete-instance', localInstance)"
                />
            </ff-kebab-menu>
        </div>
    </div>
    <InstanceStatusPolling :instance="localInstance" @instance-updated="instanceUpdated" />
</template>

<script>
import { ChartPieIcon } from '@heroicons/vue/outline'

import InstanceStatusPolling from '../../../../../components/InstanceStatusPolling.vue'
import ProjectIcon from '../../../../../components/icons/Projects.js'
import AuditMixin from '../../../../../mixins/Audit.js'
import instanceActionsMixin from '../../../../../mixins/InstanceActions.js'
import permissionsMixin from '../../../../../mixins/Permissions.js'

import FfKebabMenu from '../../../../../ui-components/components/KebabMenu.vue'
import { InstanceStateMutator } from '../../../../../utils/InstanceStateMutator.js'
import DashboardLink from '../../../../instance/components/DashboardLink.vue'
import InstanceEditorLink from '../../../../instance/components/EditorLink.vue'
import InstanceStatusBadge from '../../../../instance/components/InstanceStatusBadge.vue'

export default {
    name: 'InstanceTile',
    components: {
        DashboardLink,
        ProjectIcon,
        FfKebabMenu,
        InstanceStatusBadge,
        InstanceStatusPolling,
        ChartPieIcon,
        InstanceEditorLink
    },
    mixins: [AuditMixin, permissionsMixin, instanceActionsMixin],
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    emits: ['delete-instance'],
    data () {
        return {
            localInstance: this.instance
        }
    },
    computed: {
        isInstanceRunning () {
            return this.localInstance.meta?.state === 'running'
        },
        editorAvailable () {
            return !this.isHA && this.instanceRunning
        },
        instanceRunning () {
            return this.localInstance?.meta?.state === 'running'
        },
        isHA () {
            return this.instance?.ha?.replicas !== undefined
        },
        instanceSuspended () {
            return this.localInstance.meta?.state === 'suspended'
        }
    },
    watch: {
        instance (newValue) {
            this.instanceUpdated(newValue)
        }
    },
    methods: {
        instanceUpdated (instanceData) {
            const mutator = new InstanceStateMutator(instanceData)
            mutator.clearState()

            this.localInstance = { ...this.localInstance, ...instanceData }
        },
        openInstance () {
            this.$router.push({
                name: 'Instance',
                params: {
                    id: this.localInstance.id
                }
            })
        }
    }
}
</script>
