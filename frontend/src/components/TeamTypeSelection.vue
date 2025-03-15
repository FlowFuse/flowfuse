<template>
    <div>
        <div class="flex gap-6 justify-center relative z-10 flex-wrap">
            <team-type-tile v-for="type in types" :key="type.id" :team-type="type" />
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import teamTypesApi from '../api/teamTypes.js'

import TeamTypeTile from './TeamTypeTile.vue'

export default {
    name: 'TeamTypeSelection',
    components: {
        'team-type-tile': TeamTypeTile
    },
    data () {
        return {
            types: []
        }
    },
    computed: {
        ...mapState('account', ['user'])
    },
    async created () {
        const { types } = await teamTypesApi.getTeamTypes()
        this.types = types.sort((a, b) => a.order - b.order)
    }
}
</script>
