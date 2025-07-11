<template>
    <div class="instance-tile">
        <div class="status">
            <InstanceStatusBadge
                v-if="!minimalView"
                :status="localInstance.meta?.state"
                text=""
                :pendingStateChange="localInstance.pendingStateChange"
                :optimisticStateChange="localInstance.optimisticStateChange"
                :instanceId="localInstance.id"
                instanceType="instance"
            />
            <InstanceMinimalStatusBadge v-else :status="localInstance.meta?.state" />
        </div>
        <div class="details">
            <div class="detail-wrapper">
                <router-link
                    :to="{ name: 'Instance', params: { id: localInstance.id } }"
                    :title="localInstance.name"
                    class="name"
                    :class="{'no-highlight': isHoveringInstanceUrl}"
                >
                    {{ localInstance.name }}
                </router-link>
            </div>
            <div class="detail-wrapper detail">
                <a
                    v-if="isInstanceRunning"
                    :href="localInstance.url"
                    target="_blank"
                    class="editor-link"
                    @click.stop @mouseover="isHoveringInstanceUrl = true"
                    @mouseleave="isHoveringInstanceUrl = false"
                >
                    {{ localInstance.url }}
                </a>
                <span v-else class="editor-link inactive">
                    {{ localInstance.url }}
                </span>
            </div>
        </div>
        <div class="actions">
            <DashboardLink
                v-if="instance.settings?.dashboard2UI"
                :instance="instance"
                :disabled="!editorAvailable"
                :show-text="showButtonLabels"
                :minimal-view="minimalView"
            />

            <InstanceEditorLink
                v-if="!localInstance.ha?.replicas !== undefined"
                :disabled="!isInstanceRunning"
                :editorDisabled="!!(localInstance.settings?.disableEditor)"
                :url="instance.url"
                :instance="instance"
                :show-text="showButtonLabels"
                :minimal-view="minimalView"
            />

            <ff-kebab-menu v-if="shouldDisplayKebabMenu" @click.stop>
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
import { mapGetters } from 'vuex'

import InstanceStatusPolling from '../../../../../components/InstanceStatusPolling.vue'
import AuditMixin from '../../../../../mixins/Audit.js'
import instanceActionsMixin from '../../../../../mixins/InstanceActions.js'
import permissionsMixin from '../../../../../mixins/Permissions.js'

import FfKebabMenu from '../../../../../ui-components/components/KebabMenu.vue'
import { InstanceStateMutator } from '../../../../../utils/InstanceStateMutator.js'
import DashboardLink from '../../../../instance/components/DashboardLink.vue'
import InstanceEditorLink from '../../../../instance/components/EditorLink.vue'
import InstanceMinimalStatusBadge from '../../../../instance/components/InstanceMinimalStatusBadge.vue'
import InstanceStatusBadge from '../../../../instance/components/InstanceStatusBadge.vue'

export default {
    name: 'InstanceTile',
    components: {
        DashboardLink,
        FfKebabMenu,
        InstanceStatusBadge,
        InstanceStatusPolling,
        InstanceEditorLink,
        InstanceMinimalStatusBadge
    },
    mixins: [AuditMixin, permissionsMixin, instanceActionsMixin],
    props: {
        instance: {
            required: true,
            type: Object
        },
        showButtonLabels: {
            type: Boolean,
            default: true
        },
        minimalView: {
            type: Boolean,
            default: false
        }
    },
    emits: ['delete-instance'],
    data () {
        return {
            localInstance: this.instance,
            isHoveringInstanceUrl: false
        }
    },
    computed: {
        ...mapGetters('account', ['isAdminUser']),
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
        },
        shouldDisplayKebabMenu () {
            return this.isAdminUser || this.hasPermission('project:change-status')
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
        }
    }
}
</script>
