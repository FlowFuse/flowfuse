<!-- eslint-disable vue/attribute-hyphenation -->
<template>
    <ff-dialog
        ref="dialog"
        header="Select Target Snapshot"
        confirm-label="Assign"
        :disable-primary="!formValid"
        class="ff-dialog-fixed-height"
        data-el="snapshot-assign-dialog"
        @confirm="confirm()"
    >
        <template #default>
            <ff-loading
                v-if="loading"
                message="Loading Snapshots..."
            />
            <form
                v-else
                class="space-y-6 mt-2"
                @submit.prevent="confirm()"
            >
                <p>Please select the Snapshot that you wish to deploy to all of your devices assigned to this instance.</p>
                <FormRow
                    data-form="snapshot"
                    containerClass="w-full"
                >
                    Target Snapshot
                    <template #input>
                        <ff-dropdown
                            v-if="snapshots.length > 0"
                            v-model="selectedSnapshotId"
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
                            There are no snapshots to choose from for this instance yet!<br>
                            Snapshots can be managed on the
                            <router-link :to="{ name: 'instance-snapshots', params: { id: instance.id }}">
                                Instance Snapshots
                            </router-link> page.
                        </div>
                    </template>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import InstanceApi from '../../../../api/instances.js'
import snapshotApi from '../../../../api/projectSnapshots.js'

import FormRow from '../../../../components/FormRow.vue'
import alerts from '../../../../services/alerts.js'

export default {
    name: 'SnapshotAssignDialog',
    components: {
        FormRow
    },
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    emits: ['snapshot-assigned'],
    data () {
        return {
            loading: true,
            selectedSnapshotId: null,
            snapshots: [],
            submitted: false
        }
    },
    computed: {
        formValid () {
            return !this.submitted && this.selectedSnapshotId && this.instance.targetSnapshot?.id !== this.selectedSnapshotId
        },
        snapshotOptions () {
            return this.snapshots.map((snapshot) => {
                return {
                    value: snapshot.id,
                    label: `${snapshot.name}${this.instance.targetSnapshot?.id === snapshot.id ? ' (active)' : ''}`
                }
            })
        }
    },
    methods: {
        show () {
            this.reset()
            this.fetchData()
            this.$refs.dialog.show()
        },
        reset () {
            this.selectedSnapshotId = null
            this.submitted = false
        },
        fetchData: async function () {
            const data = await snapshotApi.getInstanceSnapshots(this.instance.id)
            this.snapshots = data.snapshots

            this.loading = false
        },
        async confirm () {
            if (this.formValid) {
                this.submitted = true

                await InstanceApi.updateInstanceDeviceSettings(this.instance.id, {
                    targetSnapshot: this.selectedSnapshotId
                })

                this.$emit('snapshot-assigned')

                alerts.emit('Target snapshot updated.', 'confirmation')

                this.$refs.dialog.close()
            }
        }
    }
}
</script>
