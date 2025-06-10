<template>
    <ff-dialog
        ref="dialog"
        data-el="deploy-stage-dialog"
        :header="`Push to &quot;${target?.name}&quot;`"
    >
        <template #default>
            <p>
                Are you sure you want to push from "{{ stage.name }}" to "{{
                    target?.name
                }}"?
            </p>
            <p class="my-4">
                This will
                <template v-if="stage.stageType === StageType.DEVICEGROUP">
                    use the group's target snapshot from "{{ stage.name }}" and
                </template>
                <template v-else-if="stage.stageType === StageType.GITREPO">
                    pull the snapshot from the configured Git repository and
                </template>
                <template v-else-if="stage.action === StageAction.CREATE_SNAPSHOT">
                    create a new snapshot in "{{ stage.name }}" and
                </template>
                <template v-else-if="stage.action === StageAction.USE_LATEST_SNAPSHOT">
                    use the latest instance snapshot from "{{ stage.name }}" and
                </template>
                <template v-else-if="stage.action === StageAction.PROMPT">
                    use the snapshot selected below from "{{ stage.name }}" and
                </template>
                <template v-if="target?.stageType === StageType.GITREPO">
                    push it to the configured Git repository.
                </template>
                <template v-else>
                    copy over all flows, nodes, environment variables and credentials to "{{ target?.name }}".
                </template>
            </p>
            <template v-if="target?.stageType === StageType.DEVICEGROUP">
                <p class="my-4">
                    All devices in the target group will be notified and this may result in them re-loading with a new configuration.
                </p>
            </template>
            <template v-else-if="target?.deployToDevices">
                <p class="my-4">
                    And push out the changes to all devices connected to "{{ target?.name }}".
                </p>
            </template>
            <p v-if="target?.stageType !== StageType.GITREPO" class="my-4">
                NOTE: Environment variables in the target {{ targetTypeName }} that already have a value will not be overwritten.
            </p>

            <template v-if="(promptForSnapshot || useLatestSnapshot) && loadingSnapshots">
                <ff-loading message="Loading..." />
            </template>
            <template v-else-if="promptForSnapshot">
                <form class="space-y-2" @submit.prevent="confirm">
                    <p>
                        Please select the Snapshot from "{{ stage.name }}" that you wish to push to "{{ target?.name }}":
                    </p>
                    <FormRow data-form="snapshot" containerClass="w-full">
                        Source Snapshot
                        <template #input>
                            <ff-combobox
                                v-if="hasSnapshots"
                                v-model="input.selectedSnapshotId"
                                :options="snapshotOptions"
                                :extend-search-keys="['description', 'user.username']"
                                placeholder="Select a snapshot"
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
                                            <span>Created </span>
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
                                There are no snapshots to choose from for this stage's
                                <template v-if="stage.stageType == StageType.INSTANCE">
                                    instance yet!<br><br>

                                    Snapshots can be managed on the
                                    <router-link
                                        :to="{
                                            name: 'instance-snapshots',
                                            params: { id: stage.instance.id },
                                        }"
                                    >
                                        Instance Snapshots
                                    </router-link>
                                    page.
                                </template>
                                <template v-else-if="stage.stageType === StageType.DEVICE">
                                    device yet!<br><br>

                                    Device snapshots can be managed on the
                                    <router-link
                                        :to="{
                                            name: 'DeviceSnapshots',
                                            params: { id: stage.device.id },
                                        }"
                                    >
                                        Device Snapshots
                                    </router-link>
                                    page.
                                </template>
                            </div>
                        </template>
                    </FormRow>
                </form>
            </template>
            <template v-else-if="useLatestSnapshot">
                <template v-if="stage.stageType == StageType.DEVICEGROUP">
                    <div v-if="!hasSnapshots" class="error-banner">
                        This stage's device group does not have a target snapshot
                        set yet!
                    </div>
                </template>
                <template v-else>
                    <div v-if="!hasSnapshots" class="error-banner">
                        No snapshots have been created for this stage's
                        <template v-if="stage.stageType == StageType.INSTANCE">
                            instance yet!<br><br>

                            Snapshots can be managed on the
                            <router-link
                                :to="{
                                    name: 'instance-snapshots',
                                    params: { id: stage.instance.id },
                                }"
                            >
                                Instance Snapshots
                            </router-link>
                            page.
                        </template>
                        <template v-else-if="stage.stageType === StageType.DEVICE">
                            device yet!<br><br>

                            Device snapshots can be managed on the
                            <router-link
                                :to="{
                                    name: 'DeviceSnapshots',
                                    params: { id: stage.device.id },
                                }"
                            >
                                Device Snapshots
                            </router-link>
                            page.
                        </template>
                    </div>
                </template>
            </template>
        </template>
        <template #actions>
            <ff-button kind="secondary" @click="close">Cancel</ff-button>
            <ff-button :disabled="!formValid" @click="confirm">Confirm</ff-button>
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
        background-color: $ff-red-50;
        border: 1px solid $ff-red-300;
        border-radius: 3px;
        color: $ff-red-600;
    }
</style>
