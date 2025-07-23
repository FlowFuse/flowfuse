<template>
    <section class="ff-applications-list-instances--compact" data-el="application-instances">
        <label class="delimiter">
            <IconNodeRedSolid class="ff-icon ff-icon-sm text-red-800" /> Hosted Instances
        </label>
        <div class="items-wrapper">
            <instance-counter :counter="0" state="running" type="hosted" />
            <instance-counter :counter="0" state="error" type="hosted" />
            <instance-counter :counter="0" state="stopped" type="hosted" />
        </div>
    </section>
</template>

<script>
import { mapState } from 'vuex'

import IconNodeRedSolid from '../../../../../components/icons/NodeRedSolid.js'
import InstanceCounter from '../../../../../components/tiles/InstanceCounter.vue'

export default {
    name: 'InstancesWrapper',
    components: { InstanceCounter, IconNodeRedSolid },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        }
    },
    computed: {
        ...mapState('account', ['team'])
    }
}
</script>
