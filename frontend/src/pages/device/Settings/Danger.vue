<template>
    <ff-loading v-if="loading.deleting" message="Deleting Device..." />
    <template v-if="!loading.deleting && device?.lastSeenAt">
        <FormHeading class="text-red-700">Regenerate Configuration</FormHeading>
        <div class="flex flex-col lg:flex-row max-w-2xl space-y-4 mb-8" data-el="device-regenerate-config">
            <div class="grow">
                <div class="max-w-sm pt-2">
                    Regenerate the agent configuration for this Remote Instance.
                </div>
            </div>
            <div class="min-w-fit shrink-0">
                <ff-button kind="danger" @click="showRegenerateDialog()">Regenerate Configuration</ff-button>
            </div>
        </div>
    </template>
    <FormHeading v-if="!loading.deleting" class="text-red-700">Delete Remote Instance</FormHeading>
    <div v-if="!loading.deleting" class="flex flex-col lg:flex-row max-w-2xl space-y-4" data-el="device-danger">
        <div class="grow">
            <div class="max-w-sm pt-2">
                Once deleted, your Remote Instance is removed. This cannot be undone.
            </div>
        </div>
        <div class="min-w-fit shrink-0">
            <ff-button kind="danger" @click="showConfirmDeleteDialog()">Delete Remote Instance</ff-button>
            <ConfirmDeviceDeleteDialog @delete-device="deleteDevice()" ref="confirmDeviceDeleteDialog" />
        </div>
    </div>
    <DeviceCredentialsDialog ref="deviceCredentialsDialog" />
</template>
<script>
import { mapState } from 'pinia'

import deviceApi from '../../../api/devices.js'
import FormHeading from '../../../components/FormHeading.vue'
import usePermissions from '../../../composables/Permissions.js'
import DeviceCredentialsDialog from '../../team/Devices/dialogs/DeviceCredentialsDialog.vue'

import ConfirmDeviceDeleteDialog from './dialogs/ConfirmDeviceDeleteDialog.vue'

import { useContextStore } from '@/stores/context.js'

export default {
    name: 'DeviceSettingsDanger',
    props: ['device'],
    emits: ['device-updated'],
    inheritAttrs: false,
    components: {
        ConfirmDeviceDeleteDialog,
        DeviceCredentialsDialog,
        FormHeading
    },
    computed: {
        ...mapState(useContextStore, ['team'])
    },
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data () {
        return {
            loading: {
                deleting: false
            }
        }
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function () {
            if (!this.hasPermission('device:edit', { application: this.device.application })) {
                return this.$router.replace({ name: 'device-settings' })
            }
        },
        showConfirmDeleteDialog () {
            this.$refs.confirmDeviceDeleteDialog.show(this.device)
        },
        showRegenerateDialog () {
            this.$refs.deviceCredentialsDialog.show(this.device)
        },
        deleteDevice () {
            this.loading.deleting = true
            deviceApi.deleteDevice(this.device.id, this.team.id).then(() => {
                this.$router.push({ name: 'TeamDevices', params: { team_slug: this.team.slug } })
            }).catch(err => {
                console.warn(err)
            }).finally(() => {
                this.loading.deleting = false
            })
        }
    }
}
</script>
