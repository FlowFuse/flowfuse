<template>
    <ff-loading v-if="loading.deleting" message="Deleting Device..." />
    <FormHeading v-if="!loading.deleting" class="text-red-700">Delete Remote Instance</FormHeading>
    <div v-if="!loading.deleting" class="flex flex-col lg:flex-row max-w-2xl space-y-4">
        <div class="flex-grow">
            <div class="max-w-sm pt-2">
                Once deleted, your Remote Instance is removed. This cannot be undone.
            </div>
        </div>
        <div class="min-w-fit flex-shrink-0">
            <ff-button kind="danger" @click="showConfirmDeleteDialog()">Delete Remote Instance</ff-button>
            <ConfirmDeviceDeleteDialog @delete-device="deleteDevice()" ref="confirmDeviceDeleteDialog" />
        </div>
    </div>
</template>
<script>
import { useRouter } from 'vue-router'
import { mapState } from 'vuex'

import deviceApi from '../../../api/devices.js'
import FormHeading from '../../../components/FormHeading.vue'
import permissionsMixin from '../../../mixins/Permissions.js'

import ConfirmDeviceDeleteDialog from './dialogs/ConfirmDeviceDeleteDialog.vue'

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
