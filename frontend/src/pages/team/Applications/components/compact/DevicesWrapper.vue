<template>
    <section class="ff-applications-list-instances--compact" data-el="application-devices">
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

export default {
    name: 'DevicesWrapper',
    components: { IconDeviceSolid, InstanceCounter },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        }
    },
    computed: {
        ...mapState('account', ['team']),
        isSearching () {
            return this.searchQuery.length > 0
        }
    }
}
</script>

<style scoped lang="scss">

</style>
