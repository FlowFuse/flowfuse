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
                <template v-if="stage.action === 'create_snapshot'">
                    create a new snapshot in "{{ stage.name }}" and
                </template>
                <template v-else-if="stage.action === 'use_latest_snapshot'">
                    use the latest instance snapshot from "{{ stage.name }}" and
                </template>
                <template v-else-if="stage.action==='prompt'">
                    use the snapshot selected below from "{{ stage.name }}" and
                </template>
                copy over all flows, nodes and credentials to "{{ target?.name }}".
            </p>
            <template v-if="target?.deployToDevices">
                <p class="my-4">
                    And push out the changes to all devices connected to "{{ target?.name }}".
                </p>
            </template>
            <p class="my-4">
                It will also transfer the keys, but not the values, of any newly created Environment
                Variables that your target instance does not currently have.
            </p>

            <template v-if="promptForSnapshot">
                <ff-loading v-if="loadingSnapshots" message="Loading stage Snapshots..." />
                <form class="space-y-2" @submit.prevent="confirm">
                    <p>
                        Please select the Snapshot from "{{ stage.name }}" that you wish to push to "{{ target?.name }}":
                    </p>
                    <FormRow data-form="snapshot" containerClass="w-full">
                        Source Snapshot
                        <template #input>
                            <ff-dropdown
                                v-if="snapshots.length > 0"
                                v-model="input.selectedSnapshotId"
                                placeholder="Select a snapshot"
                                data-form="snapshot-select"
                                class="w-full"
                            >
                                <ff-dropdown-option
                                    v-for="snapshot in snapshotOptions"
                                    :key="snapshot.value"
                                    :label="snapshot.label"
                                    :value="snapshot.value"
                                />
                            </ff-dropdown>
                            <div v-else>
                                There are no snapshots to choose from for this stage's
                                <template v-if="stage.stageType == StageType.INSTANCE">
                                    instance yet!<br>

                                    Snapshots can be managed on the
                                    <router-link
                                        :to="{
                                            name: 'InstanceSnapshots',
                                            params: { id: stage.instance.id },
                                        }"
                                    >
                                        Instance Snapshots
                                    </router-link>
                                    page.
                                </template>
                                <template v-else-if="stage.stageType === StageType.DEVICE">
                                    device yet!<br>

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
        </template>
        <template #actions>
            <ff-button kind="secondary" @click="close">Cancel</ff-button>
            <ff-button :disabled="!formValid" @click="confirm">Confirm</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import DeviceApi from '../../api/devices.js'
import { StageType } from '../../api/pipeline.js'
import SnapshotApi from '../../api/projectSnapshots.js'
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
            return this.stage.action === 'prompt'
        },

        formValid () {
            return (
                this.target !== null &&
                    (this.promptForSnapshot ? this.input.selectedSnapshotId !== null : true)
            )
        },

        snapshotOptions () {
            return this.snapshots.map((snapshot) => {
                return {
                    value: snapshot.id,
                    label: `${snapshot.name}${
                        this.stage.instance.targetSnapshot?.id === snapshot.id
                            ? ' (active)'
                            : ''
                    }`
                }
            })
        }
    },
    created () {
        this.StageType = StageType
    },
    methods: {
        close () {
            this.$refs.dialog.close()
        },
        fetchData: async function () {
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
            } else {
                throw Error(`Unknown stage type ${this.stage.stageType}`)
            }

            this.loadingSnapshots = false
        },
        confirm () {
            if (!this.formValid) {
                return
            }

            const sourceSnapshot = this.snapshots.find(
                (snapshot) => snapshot.id === this.input.selectedSnapshotId
            )

            this.$emit('deploy-stage', this.target, sourceSnapshot)

            this.$refs.dialog.close()
        }
    }
}
</script>
