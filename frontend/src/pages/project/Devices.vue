<template>
    <div>
        <TeamDevices v-if="features.devices" :project="project" :team="team" :teamMembership="teamMembership" />
    </div>
</template>

<script>
import { mapState } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import TeamDevices from '@/pages/team/Devices/index'
export default {
    name: 'ProjectDevices',
    props: ['project'],
    computed: {
        ...mapState('account', ['team', 'teamMembership', 'features'])
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function () {
            if (!this.features.devices) {
                useRouter().push({ path: `/project/${useRoute().params.id}/overview` })
            }
        }
    },
    components: {
        TeamDevices
    }
}
</script>
