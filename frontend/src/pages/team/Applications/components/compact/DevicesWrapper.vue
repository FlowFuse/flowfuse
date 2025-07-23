<template>
    <section v-if="hasNoDevices" class="ff-no-data--boxed" data-el="application-devices-none">
        <label class="delimiter">
            <IconDeviceSolid class="ff-icon ff-icon-sm text-teal-700" />
            Remote Instances
        </label>
        <span v-if="!isSearching" class="message">
            This Application currently has no
            <router-link :to="{name: 'ApplicationDevices', params: {team_slug: team.slug, id: application.id}}" class="ff-link">
                attached Remote Instances
            </router-link>.
        </span>
        <span v-else class="message">
            No device matches your criteria.
        </span>
    </section>
    <section v-else class="ff-applications-list-instances--compact" data-el="application-devices">
        <label class="delimiter">
            <IconDeviceSolid class="ff-icon ff-icon-sm text-teal-700" />
            Remote Instances
        </label>
        <div class="items-wrapper">
            <instance-counter :counter="0" state="running" type="remote" />
            <instance-counter :counter="0" state="error" type="remote" />
            <instance-counter :counter="0" state="stopped" type="remote" />
        </div>
    </section>
</template>

<script>
import { mapState } from 'vuex'

import IconDeviceSolid from '../../../../../components/icons/DeviceSolid.js'
import InstanceCounter from '../../../../../components/tiles/InstanceCounter.vue'
import deviceActionsMixin from '../../../../../mixins/DeviceActions.js'

export default {
    name: 'DevicesWrapper',
    components: { IconDeviceSolid, InstanceCounter },
    mixins: [deviceActionsMixin],
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        },
        searchQuery: {
            type: String,
            required: false,
            default: ''
        }
    },
    data () {
        return {
            devices: this.application.devices,
            deviceEditModalOpened: false
        }
    },
    computed: {
        ...mapState('account', ['team']),
        hasNoDevices () {
            return this.devices.length === 0
        },
        isSearching () {
            return this.searchQuery.length > 0
        }
    },
    watch: {
        'application.devices' (devices) {
            this.devices = devices
        }
    }
}
</script>

<style scoped lang="scss">

</style>
