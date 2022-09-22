<template>
    <ff-loading v-if="loading.deleting" message="Deleting Device..."></ff-loading>
    <FormHeading v-if="!loading.deleting" class="text-red-700">Delete Device</FormHeading>
    <div v-if="!loading.deleting" class="flex flex-col lg:flex-row max-w-2xl space-y-4">
        <div class="flex-grow">
            <div class="max-w-sm pt-2">
                Once deleted, your device is removed. This cannot be undone.
            </div>
        </div>
        <div class="min-w-fit flex-shrink-0">
            <ff-button kind="danger" @click="showConfirmDeleteDialog()">Delete Device</ff-button>
            <ConfirmDeviceDeleteDialog @delete-device="deleteDevice()" ref="confirmDeviceDeleteDialog"/>
        </div>
    </div>
</template>
<script>
import { mapState } from 'vuex'
import { useRouter } from 'vue-router'

import deviceApi from '@/api/devices'
import permissionsMixin from '@/mixins/Permissions'

import FormHeading from '@/components/FormHeading'
import ConfirmDeviceDeleteDialog from './dialogs/ConfirmDeviceDeleteDialog'

export default {
    name: 'DeviceSettingsDanger',
    props: ['device'],
    emits: ['device-updated'],
    mixins: [permissionsMixin],
    components: {
        ConfirmDeviceDeleteDialog,
        FormHeading
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership'])
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
            if (!this.hasPermission('device:edit')) {
                useRouter().push({ replace: true, path: 'general' })
            }
        },
        showConfirmDeleteDialog () {
            this.$refs.confirmDeviceDeleteDialog.show(this.device)
        },
        deleteDevice () {
            this.loading.deleting = true
            deviceApi.deleteDevice(this.device.id).then(() => {
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
