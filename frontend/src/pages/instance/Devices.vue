<template>
    <DevicesBrowser
        :team="team"
        :teamMembership="teamMembership"
        :instance="instance"
        @instance-updated="$emit('instance-updated', ...arguments)"
    />
</template>

<script>
import { mapState } from 'vuex'

import SectionTopMenu from '@/components/SectionTopMenu.vue'
import DevicesBrowser from '../../components/DevicesBrowser.vue'

import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'InstanceRemoteInstances',
    components: {
        DevicesBrowser,
        SectionTopMenu
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    emits: ['instance-updated'],
    computed: {
        ...mapState('account', ['team', 'teamMembership'])
    }
}
</script>
