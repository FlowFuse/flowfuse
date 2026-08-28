<template>
    <ff-dialog
        ref="dialog"
        data-el="deploy-stage-dialog"
        :header="`Push to &quot;${target?.name}&quot;`"
    >
        <template #default>
            <p>{{ $t('ui.areYouSureYouWantToPushFromP0ToP1', { p0: stage.name, p1: target?.name }) }}</p>
            <p class="my-4">
                {{ $t('ui.thisWill') }}
                <template v-if="stage.stageType === StageType.DEVICEGROUP">{{ $t('ui.useTheGroupSTargetSnapshotFromP0And', { p0: stage.name }) }}</template>
                <template v-else-if="stage.stageType === StageType.GITREPO">
                    {{ $t('ui.pullTheSnapshotFromTheConfiguredGitRepositoryAnd') }}
                </template>
                <template v-else-if="stage.action === StageAction.CREATE_SNAPSHOT">{{ $t('ui.createANewSnapshotInP0And', { p0: stage.name }) }}</template>
                <template v-else-if="stage.action === StageAction.USE_LATEST_SNAPSHOT">{{ $t('ui.useTheLatestInstanceSnapshotFromP0And', { p0: stage.name }) }}</template>
                <template v-else-if="stage.action === StageAction.PROMPT">{{ $t('ui.useTheSnapshotSelectedBelowFromP0And', { p0: stage.name }) }}</template>
                <template v-if="target?.stageType === StageType.GITREPO">
                    {{ $t('ui.pushItToTheConfiguredGitRepository') }}
                </template>
                <template v-else>{{ $t('ui.copyOverAllFlowsNodesEnvironmentVariablesAndCred', { p0: target?.name }) }}</template>
            </p>
            <template v-if="target?.stageType === StageType.DEVICEGROUP">
                <p class="my-4">
                    {{ $t('ui.allDevicesInTheTargetGroupWillBeNotifiedAndThisM') }}
                </p>
            </template>
            <template v-else-if="target?.deployToDevices">
                <p class="my-4">{{ $t('ui.andPushOutTheChangesToAllDevicesConnectedToP0', { p0: target?.name }) }}</p>
            </template>
            <p v-if="target?.stageType !== StageType.GITREPO" class="my-4">{{ $t('ui.noteEnvironmentVariablesInTheTargetP0ThatAlready', { p0: targetTypeName }) }}</p>

            <template v-if="(promptForSnapshot || useLatestSnapshot) && loadingSnapshots">
                <ff-loading :message="$t('ui.loading')" />
            </template>
            <template v-else-if="promptForSnapshot">
                <form class="space-y-2" @submit.prevent="confirm">
                    <p>{{ $t('ui.pleaseSelectTheSnapshotFromP0ThatYouWishToPushTo', { p0: stage.name, p1: target?.name }) }}</p>
                    <FormRow data-form="snapshot" containerClass="w-full">
                        {{ $t('ui.sourceSnapshot') }}
                        <template #input>
                            <ff-combobox
                                v-if="hasSnapshots"
                                v-model="input.selectedSnapshotId"
                                :options="snapshotOptions"
                                :extend-search-keys="['description', 'user.username']"
                                :placeholder="$t('ui.selectASnapshot')"
                                data-form="snapshot-select"
                                class="w-full"
                            >
                                <template #option="{ option, selected, active }">
                                    <div class="ff-option-content" :class="{ selected, active }">
                                        <div class="flex justify-between mb-1">
                                            <span>{{ option.label }}</span>
                                            <span v-if="option.user && option.user.username" class="text-gray-400">{{ option.user.username }}</span>
                                        </div>
                                        <p class="text-italic text-gray-400 mb-1">
                                            {{ option.description }}
                                        </p>
                                        <p v-if="option.createdAt" class="text-gray-400 text-sm">
                                            <span>{{ $t('ui.created') }} </span>
                                            <span
                                                v-ff-tooltip:bottom="new Date(option.createdAt).toDateString() + ' - ' + new Date(option.createdAt).toLocaleTimeString()"
                                                class=""
                                            >
                                                {{ daysSince(option.createdAt, true) }}
                                            </span>
                                        </p>
                                    </div>
                                </template>
                            </ff-combobox>
                            <div v-else class="error-banner">
                                {{ $t('ui.thereAreNoSnapshotsToChooseFromForThisStageS') }}
                                <template v-if="stage.stageType == StageType.INSTANCE">
                                    {{ $t('ui.instanceYet') }}<br><br>

                                    {{ $t('ui.snapshotsCanBeManagedOnThe') }}
                                    <router-link
                                        :to="{
                                            name: 'instance-snapshots',
                                            params: { id: stage.instance.id },
                                        }"
                                    >
                                        {{ $t('ui.instanceSnapshots') }}
                                    </router-link>
                                    {{ $t('ui.page') }}
                                </template>
                                <template v-else-if="stage.stageType === StageType.DEVICE">
                                    {{ $t('ui.deviceYet') }}<br><br>

                                    {{ $t('ui.deviceSnapshotsCanBeManagedOnThe') }}
                                    <router-link
                                        :to="{
                                            name: 'device-version-history',
                                            params: { id: stage.device.id },
                                        }"
                                    >
                                        {{ $t('ui.deviceSnapshots') }}
                                    </router-link>
                                    {{ $t('ui.page') }}
                                </template>
                            </div>
                        </template>
                    </FormRow>
                </form>
            </template>
            <template v-else-if="useLatestSnapshot">
                <template v-if="stage.stageType == StageType.DEVICEGROUP">
                    <div v-if="!hasSnapshots" class="error-banner">
                        {{ $t('ui.thisStageSDeviceGroupDoesNotHaveATargetSnapshotS') }}
                    </div>
                </template>
                <template v-else>
                    <div v-if="!hasSnapshots" class="error-banner">
                        {{ $t('ui.noSnapshotsHaveBeenCreatedForThisStageS') }}
                        <template v-if="stage.stageType == StageType.INSTANCE">
                            {{ $t('ui.instanceYet') }}<br><br>

                            {{ $t('ui.snapshotsCanBeManagedOnThe') }}
                            <router-link
                                :to="{
                                    name: 'instance-snapshots',
                                    params: { id: stage.instance.id },
                                }"
                            >
                                {{ $t('ui.instanceSnapshots') }}
                            </router-link>
                            {{ $t('ui.page') }}
                        </template>
                        <template v-else-if="stage.stageType === StageType.DEVICE">
                            {{ $t('ui.deviceYet') }}<br><br>

                            {{ $t('ui.deviceSnapshotsCanBeManagedOnThe') }}
                            <router-link
                                :to="{
                                    name: 'device-version-history',
                                    params: { id: stage.device.id },
                                }"
                            >
                                {{ $t('ui.deviceSnapshots') }}
                            </router-link>
                            {{ $t('ui.page') }}
                        </template>
                    </div>
                </template>
            </template>
        </template>
        <template #actions>
            <ff-button kind="secondary" @click="close">{{ $t('ui.cancel') }}</ff-button>
            <ff-button :disabled="!formValid" @click="confirm">{{ $t('ui.confirm') }}</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import DeviceApi from '../../api/devices.js'
import { StageAction, StageType } from '../../api/pipeline.js'
import SnapshotApi from '../../api/projectSnapshots.js'
import SnapshotsApi from '../../api/snapshots.js'
import daysSince from '../../utils/daysSince.js'
import FormRow from '../FormRow.vue'

export default {
    name: 'DeployStageDialog',
    components: {
        FormRow
    },
    props: {
        stage: {
            required: true,
            type: Object
        }
    },
    emits: ['deploy-stage'],
    setup () {
        return {
            daysSince,
            show (target) {
                this.target = target

                this.fetchData()

                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            target: null,
            loadingSnapshots: false,
            snapshots: [],
            input: {
                selectedSnapshotId: null
            }
        }
    },
    computed: {
        promptForSnapshot () {
            return this.stage.stageType !== StageType.DEVICEGROUP && this.stage.action === StageAction.PROMPT
        },

        useLatestSnapshot () {
            return this.stage.stageType === StageType.DEVICEGROUP || this.stage.action === StageAction.USE_LATEST_SNAPSHOT
        },

        formValid () {
            return (
                this.target !== null &&
                   (this.promptForSnapshot ? this.input.selectedSnapshotId !== null : true) &&
                   (this.useLatestSnapshot ? this.hasSnapshots : true)
            )
        },

        snapshotOptions () {
            return this.snapshots.map((snapshot) => {
                const isActive = this.stage.stageType === StageType.INSTANCE
                    ? this.stage.instance.targetSnapshot?.id === snapshot.id
                    : (this.stage.stageType === StageType.DEVICE ? this.stage.device.targetSnapshot?.id === snapshot.id : false)

                return {
                    value: snapshot.id,
                    label: `${snapshot.name}${isActive ? ' (active)' : ''}`,
                    id: snapshot.id,
                    description: snapshot?.description ?? null,
                    user: snapshot?.user ?? null,
                    createdAt: snapshot?.createdAt ?? null
                }
            })
        },

        hasSnapshots () {
            return this.snapshots.length > 0
        },

        targetTypeName () {
            if (this.target?.stageType === StageType.DEVICE) {
                return 'device'
            } else if (this.target?.stageType === StageType.DEVICEGROUP) {
                return 'groups devices'
            }
            return 'instance'
        }
    },
    created () {
        // Bind the enums to this. for use in the template
        this.StageType = StageType
        this.StageAction = StageAction
    },
    methods: {
        close () {
            this.$refs.dialog.close()
        },
        fetchData: async function () {
            if (this.stage.stageType === StageType.GITREPO) {
                return
            }
            this.loadingSnapshots = true

            if (this.stage.stageType === StageType.DEVICE) {
                const data = await DeviceApi.getDeviceSnapshots(
                    this.stage.device.id
                )
                this.snapshots = data.snapshots
            } else if (this.stage.stageType === StageType.INSTANCE) {
                const data = await SnapshotApi.getInstanceSnapshots(
                    this.stage.instance.id
                )
                this.snapshots = data.snapshots
            } else if (this.stage.stageType === StageType.DEVICEGROUP) {
                if (!this.stage.deviceGroup.hasTargetSnapshot) {
                    this.snapshots = []
                } else {
                    const data = await SnapshotsApi.getSummary(this.stage.deviceGroup.targetSnapshotId)
                    this.snapshots = [data]
                }
            } else {
                throw Error(`Unknown stage type ${this.stage.stageType}`)
            }

            this.loadingSnapshots = false
        },
        confirm () {
            if (!this.formValid) {
                return
            }
            let sourceSnapshot
            if (this.stage.stageType === StageType.DEVICEGROUP) {
                sourceSnapshot = this.snapshots[0]
            } else {
                sourceSnapshot = this.snapshots.find(
                    (snapshot) => snapshot.id === this.input.selectedSnapshotId
                )
            }

            this.$emit('deploy-stage', this.target, sourceSnapshot)

            this.$refs.dialog.close()
        }
    }
}
</script>

<style lang="scss" scoped>

    .error-banner {
        padding: 9px;
        background-color: var(--ff-color-status-error-bg);
        border: 1px solid var(--ff-color-status-error-border);
        border-radius: 3px;
        color: var(--ff-color-danger-strong);
    }
</style>
