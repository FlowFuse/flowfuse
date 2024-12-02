<template>
    <div class="stage">
        <span class="title truncate">
            {{ stage.name }}
        </span>
        <div class="content">
            <IconNodeRedSolid v-if="isInstanceStage" class="ff-icon-sm text-red-700" />
            <DeviceSolid v-if="isDeviceStage" class="ff-icon-sm text-teal-700" />
            <DeviceGroupSolidIcon v-if="isDeviceGroupsStage" class="ff-icon-sm text-teal-800" />
            <router-link :to="targetLink" class="title truncate">
                <span>{{ targetName }}</span>
            </router-link>
        </div>
    </div>
</template>

<script>
import DeviceGroupSolidIcon from '../../../../components/icons/DeviceGroupSolid.js'
import DeviceSolid from '../../../../components/icons/DeviceSolid.js'
import IconNodeRedSolid from '../../../../components/icons/NodeRedSolid.js'

export default {
    name: 'TeamPipelineStage',
    components: {
        DeviceSolid,
        IconNodeRedSolid,
        DeviceGroupSolidIcon
    },
    props: {
        stage: {
            required: true,
            type: Object
        },
        application: {
            required: true,
            type: Object
        }
    },
    computed: {
        isInstanceStage () {
            return Object.hasOwnProperty.call(this.stage, 'instances')
        },
        isDeviceStage () {
            return Object.hasOwnProperty.call(this.stage, 'devices')
        },
        isDeviceGroupsStage () {
            return Object.hasOwnProperty.call(this.stage, 'deviceGroups')
        },
        targetName () {
            switch (true) {
            case this.isInstanceStage:
                return this.stage.instances[0]?.name
            case this.isDeviceStage:
                return this.stage.devices[0]?.name
            case this.isDeviceGroupsStage:
                return this.stage.deviceGroups[0]?.name
            default:
                return 'N/A'
            }
        },
        targetId () {
            switch (true) {
            case this.isInstanceStage:
                return this.stage.instances[0]?.id
            case this.isDeviceStage:
                return this.stage.devices[0]?.id
            case this.isDeviceGroupsStage:
                return this.stage.deviceGroups[0]?.id
            default:
                return 'N/A'
            }
        },
        targetLink () {
            switch (true) {
            case this.isInstanceStage:
                return { name: 'Instance', params: { id: this.targetId } }
            case this.isDeviceStage:
                return { name: 'Device', params: { id: this.targetId } }
            case this.isDeviceGroupsStage:
                return { name: 'ApplicationDeviceGroupIndex', params: { deviceGroupId: this.targetId, applicationId: this.application.id } }
            default:
                return '#'
            }
        }
    }
}
</script>

<style scoped lang="scss">
.stage {
    border: 1px solid $ff-grey-400;
    border-radius: 5px;
    overflow: hidden;
    background: $ff-white;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;

    .content {
        display: flex;
        flex-direction: row;
        gap: 5px;
        font-size: 11px;
        align-items: center;

        .title {
            transition: ease-in-out .3s;

            &:hover {
                color: $ff-indigo-700;
            }
        }
    }
}
</style>
