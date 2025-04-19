<template>
    <div class="ff-pipeline-stage">
        <span class="truncate">
            {{ stage.name }}
        </span>
        <router-link :to="targetLink" class="ff-pipeline-target">
            <IconNodeRedSolid v-if="isInstanceStage" class="ff-icon-sm text-red-700" />
            <DeviceSolid v-if="isDeviceStage" class="ff-icon-sm text-teal-700" />
            <DeviceGroupSolidIcon v-if="isDeviceGroupsStage" class="ff-icon-sm text-teal-800" />
            <IconGit v-if="isGitRepoStage" class="ff-icon-sm" style="color: #e46133" />
            <span>{{ targetName }}</span>
        </router-link>
    </div>
</template>

<script>
import DeviceGroupSolidIcon from '../../../../components/icons/DeviceGroupSolid.js'
import DeviceSolid from '../../../../components/icons/DeviceSolid.js'
import IconGit from '../../../../components/icons/Git.js'
import IconNodeRedSolid from '../../../../components/icons/NodeRedSolid.js'

export default {
    name: 'TeamPipelineStage',
    components: {
        DeviceSolid,
        IconNodeRedSolid,
        DeviceGroupSolidIcon,
        IconGit
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
        isGitRepoStage () {
            return Object.hasOwnProperty.call(this.stage, 'gitRepo')
        },

        targetName () {
            switch (true) {
            case this.isInstanceStage:
                return this.stage.instances[0]?.name
            case this.isDeviceStage:
                return this.stage.devices[0]?.name
            case this.isDeviceGroupsStage:
                return this.stage.deviceGroups[0]?.name
            case this.isGitRepoStage:
                return this.stage.gitRepo?.url.replace('https://github.com/', '') + (
                    (this.stage.gitRepo?.branch && this.stage.gitRepo?.branch !== 'main' && this.stage.gitRepo?.branch !== 'master')
                        ? `@${this.stage.gitRepo.branch}`
                        : ''
                )
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
.ff-pipeline-stage {
    border: 1px solid $ff-grey-300;
    border-radius: 6px;
    overflow: hidden;
    background: $ff-white;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 225px;

    .ff-pipeline-target {
        display: flex;
        flex-direction: row;
        gap: 6px;
        font-size: 11px;
        align-items: center;
        border: 1px solid $ff-grey-300;
        padding: 6px;
        border-radius: 6px;
        transition: ease-in-out .3s;

        &:hover {
            color: $ff-indigo-700;
            border-color: $ff-indigo-700;
        }
    }
}
</style>
