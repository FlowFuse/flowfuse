<template>
    <div data-el="application-summary" class="flex flex-wrap space-x-2">
        <a
            v-if="application.instanceCount > 0"
            href="#"
            class="flex space-x-2 justify-between px-2"
            :title="`${application.instanceCount} Instance${application.instanceCount === 1 ? '' : 's'}`"
            style="border: 1px solid #D1D5DB;padding:5px;border-radius:5px;min-width:50px;"
        >
            <IconNodeRedSolid class="ff-icon text-red-700" />
            {{ application.instanceCount }}
        </a>

        <a
            v-if="application.deviceCount > 0"
            href="#"
            class="flex space-x-2 justify-between px-2"
            :title="`${application.deviceCount} Devices${application.deviceCount === 1 ? '' : 's'}`"
            style="border: 1px solid #D1D5DB;padding:5px;border-radius:5px;min-width:50px;"
        >
            <IconDeviceSolid class="ff-icon text-teal-700" />
            {{ application.instanceCount }}
        </a>

        <a
            v-if="application.deviceGroupCount > 0"
            href="#"
            class="flex space-x-2 justify-between px-2"
            :title="`${application.deviceGroupCount} Device Group${application.deviceGroupCount === 1 ? '' : 's'}`"
            style="border: 1px solid #D1D5DB;padding:5px;border-radius:5px;min-width:50px;"
        >
            <DeviceGroupSolidIcon class="ff-icon text-teal-800" />
            {{ application.deviceGroupCount }}
        </a>

        <a
            v-if="application.snapshotCount > 0"
            href="#"
            class="flex space-x-2 justify-between px-2"
            :title="`${application.snapshotCount} Snapshot${application.snapshotCount === 1 ? '' : 's'}`"
            style="border: 1px solid #D1D5DB;padding:5px;border-radius:5px;min-width:50px;"
        >
            <IconSnapshotSolid class="ff-icon text-teal-700" />
            {{ application.snapshotCount }}
        </a>

        <a
            v-if="application.pipelineCount > 0"
            href="#"
            class="flex space-x-2 justify-between px-2"
            :title="`${application.pipelineCount} Pipeline${application.pipelineCount === 1 ? '' : 's'}`"
            style="border: 1px solid #D1D5DB;padding:5px;border-radius:5px;min-width:50px;"
        >
            <IconPipelineSolid class="ff-icon text-teal-700" />
            {{ application.pipelineCount }}
        </a>
    </div>
</template>

<script>
import DeviceGroupSolidIcon from '../../../components/icons/DeviceGroupSolid.js'
import IconDeviceSolid from '../../../components/icons/DeviceSolid.js'
import IconNodeRedSolid from '../../../components/icons/NodeRedSolid.js'
import IconPipelineSolid from '../../../components/icons/PipelinesSolid.js'
import IconSnapshotSolid from '../../../components/icons/SnapshotSolid.js'

export default {
    name: 'ApplicationSummaryLabel',
    components: {
        IconNodeRedSolid,
        IconSnapshotSolid,
        IconDeviceSolid,
        DeviceGroupSolidIcon,
        IconPipelineSolid
    },
    props: {
        application: {
            type: Object,
            required: true
        }
    }
}
</script>
