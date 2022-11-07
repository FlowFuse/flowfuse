<template>
    <div>
        <TeamDevices :project="project" :team="team" :teamMembership="teamMembership" />
    </div>
</template>

<script>
import { mapState } from 'vuex'
import TeamDevices from '@/pages/team/Devices/index'
export default {
    name: 'ProjectDevices',
    props: ['project'],
    computed: {
        ...mapState('account', ['team', 'teamMembership'])
    },
    methods: { },
    components: {
        TeamDevices
    }
}
</script>
