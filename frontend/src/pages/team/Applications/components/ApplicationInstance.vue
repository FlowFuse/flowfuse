<template>
    <span class="flex justify-center mr-3">
        <IconNodeRedSolid class="ff-icon ff-icon-lg text-red-800" />
    </span>
    <div class="ff-applications-list--instance">
        <label>{{ localInstance.name }}</label>
        <span>{{ localInstance.url }}</span>
    </div>
    <div>
        <InstanceStatusBadge
            :status="localInstance.meta?.state"
            :optimisticStateChange="localInstance.optimisticStateChange"
            :pendingStateChange="localInstance.pendingStateChange"
        />
    </div>
    <div class="text-sm">
        <span v-if="!localInstance.mostRecentAuditLogCreatedAt || (localInstance.flowLastUpdatedAt > localInstance.mostRecentAuditLogCreatedAt)" class="flex flex-col">
            Flows last deployed
            <label class="text-xs text-gray-400">{{ localInstance.flowLastUpdatedSince || 'never' }}</label>
        </span>
        <span v-else-if="localInstance.mostRecentAuditLogCreatedAt" class="flex flex-col">
            {{ labelForAuditLogEntry(localInstance.mostRecentAuditLogEvent) }}
            <label class="text-xs text-gray-400"><DaysSince :date="localInstance.mostRecentAuditLogCreatedAt" /></label>
        </span>
        <span v-else class="text-gray-400 italic">
            Flows never deployed
        </span>
    </div>
    <div class="actions">
        <DashboardLinkCell
            v-if="localInstance.settings?.dashboard2UI"
            :disabled="localInstance.meta?.state !== 'running'"
            :instance="localInstance"
        />
        <InstanceEditorLinkCell
            :id="localInstance.id"
            :editorDisabled="!!(localInstance.settings?.disableEditor)"
            :disabled="localInstance.meta?.state !== 'running'"
            :isHA="localInstance.ha?.replicas !== undefined"
            :instance="localInstance"
        />
        <InstanceActionsLinkCell :instance="localInstance" />
    </div>
    <InstanceStatusPolling :instance="localInstance" @instance-updated="instanceUpdated" />
</template>

<script>
import InstanceStatusPolling from '../../../../components/InstanceStatusPolling.vue'
import IconNodeRedSolid from '../../../../components/icons/NodeRedSolid.js'
import AuditEventsService from '../../../../services/audit-events.js'
import { InstanceStateMutator } from '../../../../utils/InstanceStateMutator'
import DaysSince from '../../../application/Snapshots/components/cells/DaysSince.vue'
import InstanceStatusBadge from '../../../instance/components/InstanceStatusBadge.vue'
import DashboardLinkCell from '../../../instance/components/cells/DashboardLink.vue'
import InstanceActionsLinkCell from '../../../instance/components/cells/InstanceActionsLink.vue'
import InstanceEditorLinkCell from '../../../instance/components/cells/InstanceEditorLink.vue'

export default {
    name: 'ApplicationInstance',
    components: {
        InstanceEditorLinkCell,
        DaysSince,
        DashboardLinkCell,
        IconNodeRedSolid,
        InstanceStatusBadge,
        InstanceStatusPolling,
        InstanceActionsLinkCell
    },
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    setup () {
        return {
            AuditEvents: AuditEventsService.get()
        }
    },
    data () {
        return {
            localInstance: this.instance
        }
    },
    watch: {
        instance (newValue) {
            this.instanceUpdated(newValue)
        }
    },
    methods: {
        labelForAuditLogEntry (eventName) {
            if (!eventName) return 'Unknown Event'
            if (this.AuditEvents[eventName]) {
                return this.AuditEvents[eventName]
            }
            let labelText = eventName
            labelText = labelText.replace(/[-._:]/g, ' ')
            labelText = labelText.replace(/\b\w/g, l => l.toUpperCase())
            labelText = labelText.replace(/([a-z])([A-Z])/g, '$1 $2')
            return labelText
        },
        instanceUpdated (instanceData) {
            const mutator = new InstanceStateMutator(instanceData)
            mutator.clearState()

            this.localInstance = { ...this.localInstance, ...instanceData }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
