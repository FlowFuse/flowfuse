<template>
    <div class="ff-team-selection">
        <div @click="selectTeam(team)">
            <img :src="team.avatar" class="ff-avatar"/>
            <div class="ff-team-selection-name">
                <label>TEAM:</label>
                <h5>{{ team.name }}</h5>
            </div>
        </div>
        <SwitchHorizontalIcon :class="{'active': teamSelectionOpen }" @click="toggleList()"/>
        <ul :class="{'active': teamSelectionOpen }">
            <li class="ff-nav-item"><label>Team Selection</label></li>
            <nav-item v-for="t in teams" :key="t.id" :label="t.name" :avatar="t?.avatar" @click="selectTeam(t);toggleList()"></nav-item>
            <nav-item label="Create Team" :icon="plusIcon" @click="createTeam"></nav-item>
        </ul>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import { SwitchHorizontalIcon, PlusIcon } from '@heroicons/vue/solid'
import NavItem from '@/components/NavItem'

export default {
    name: 'FFSideTeamSelection',
    emits: ['option-selected'],
    components: {
        NavItem,
        SwitchHorizontalIcon
    },
    computed: {
        ...mapState('account', ['team', 'teams'])
    },
    data () {
        return {
            teamSelectionOpen: false,
            plusIcon: PlusIcon
        }
    },
    methods: {
        toggleList () {
            this.teamSelectionOpen = !this.teamSelectionOpen
        },
        selectTeam (team) {
            if (team) {
                this.$router.push({
                    name: 'Team',
                    params: {
                        team_slug: team.slug
                    }
                })
            }
        },
        createTeam () {
            this.$router.push({
                name: 'CreateTeam'
            })
            this.toggleList()
        }
    }
}
</script>
