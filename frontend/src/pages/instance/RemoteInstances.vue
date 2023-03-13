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

import DevicesBrowser from '../../components/DevicesBrowser.vue'

import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'InstanceRemoteInstances',
    components: {
        DevicesBrowser
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
