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
                <p>Please select the Project Snapshot that you wish to deploy to all of your devices.</p>
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
                            There are no snapshots to choose from for this project yet!<br>
                            Snapshots can be managed on the <router-link :to="`/project/${project.id}/snapshots`">
                                Project Snapshots
                            </router-link> page.
                        </div>
                    </template>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import projectApi from '@/api/project'
import snapshotApi from '@/api/projectSnapshots'

import FormRow from '@/components/FormRow'
import alerts from '@/services/alerts'

export default {
    name: 'SnapshotAssignDialog',
    components: {
        FormRow
    },
    props: {
        project: {
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
            return !this.submitted && this.selectedSnapshotId && this.project.targetSnapshot?.id !== this.selectedSnapshotId
        },
        snapshotOptions () {
            return this.snapshots.map((snapshot) => {
                return {
                    value: snapshot.id,
                    label: `${snapshot.name}${this.project.targetSnapshot?.id === snapshot.id ? ' (active)' : ''}`
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
            const data = await snapshotApi.getProjectSnapshots(this.project.id)
            this.snapshots = data.snapshots

            this.loading = false
        },
        async confirm () {
            if (this.formValid) {
                this.submitted = true

                await projectApi.updateProjectDeviceSettings(this.project.id, {
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
