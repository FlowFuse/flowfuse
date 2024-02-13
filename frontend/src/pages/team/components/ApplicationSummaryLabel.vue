<template>
    <div data-el="application-summary" class="flex flex-wrap space-x-2">
        <IconLink
            v-ff-tooltip:bottom="`${application.instanceCount} x Instance${application.instanceCount === 1 ? '' : 's'}`"
            :to="`/application/${application.id}/instances`"
            :icon="IconNodeRedSolid"
            :class="{'text-gray-400': application.instanceCount === 0}"
            iconColor="text-red-700"
        >
            {{ application.instanceCount }}
        </IconLink>

        <IconLink
            v-ff-tooltip:bottom="`${application.deviceCount} x Device${application.deviceCount === 1 ? '' : 's'}`"
            :to="`/application/${application.id}/devices`"
            :icon="IconDeviceSolid"
            :class="{'text-gray-400': application.deviceCount === 0}"
        >
            {{ application.deviceCount }}
        </IconLink>

        <IconLink
            v-ff-tooltip:bottom="`${application.deviceGroupCount} x Device Group${application.deviceGroupCount === 1 ? '' : 's'}`"
            :to="`/application/${application.id}/device-groups`"
            :icon="DeviceGroupSolidIcon"
            :class="{'text-gray-400': application.deviceGroupCount === 0}"
            iconColor="text-teal-800"
        >
            {{ application.deviceGroupCount }}
        </IconLink>

        <IconLink
            v-ff-tooltip:bottom="`${application.snapshotCount} x Snapshot${application.snapshotCount === 1 ? '' : 's'}`"
            :to="`/application/${application.id}/snapshots`"
            :icon="IconSnapshotSolid"
            :class="{'text-gray-400': application.snapshotCount === 0}"
        >
            {{ application.snapshotCount }}
        </IconLink>

        <IconLink
            v-ff-tooltip:bottom="`${application.pipelineCount} x Pipeline${application.pipelineCount === 1 ? '' : 's'}`"
            :to="`/application/${application.id}/pipelines`"
            :icon="IconPipelineSolid"
            :class="{'text-gray-400': application.pipelineCount === 0}"
        >
            {{ application.pipelineCount || 0 }}
        </IconLink>
    </div>
</template>

<script>
import IconLink from '../../../components/IconLink.vue'

import DeviceGroupSolidIcon from '../../../components/icons/DeviceGroupSolid.js'
import IconDeviceSolid from '../../../components/icons/DeviceSolid.js'
import IconNodeRedSolid from '../../../components/icons/NodeRedSolid.js'
import IconPipelineSolid from '../../../components/icons/PipelinesSolid.js'
import IconSnapshotSolid from '../../../components/icons/SnapshotSolid.js'

export default {
    name: 'ApplicationSummaryLabel',
    components: {
        IconLink
    },
    props: {
        application: {
            type: Object,
            required: true
        }
    },
    setup () {
        return {
            IconNodeRedSolid,
            IconSnapshotSolid,
            IconDeviceSolid,
            DeviceGroupSolidIcon,
            IconPipelineSolid
        }
    }
}
</script>

<style lang="scss">
@import '../../../ui-components/stylesheets/ff-colors.scss';
@import '../../../ui-components/stylesheets/ff-utility.scss';

.ff-icon-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;

  border-radius: $ff-unit-sm;
  border: 1px solid $ff-grey-300;

  height: 28px;
  padding: $ff-unit-sm 5px;

  font-size: $ff-funit-sm;
  line-height: 20px;

  svg {
    margin-right: 5px;
  }

  &:hover {
    cursor: pointer;
    border-color: $ff-blue-600;

    color: $ff-blue-600;;
    background-color: $ff-grey-50;

    .ff-icon {
        color: $ff-blue-600;
    }
  }
}
</style>
