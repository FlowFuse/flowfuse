<template>
    <ff-dropdown v-if="team" class="ff-team-selection">
        <template v-slot:placeholder>
            <div class="flex grow items-center">
                <img :src="team.avatar" class="ff-avatar"/>
                <div class="ff-team-selection-name">
                    <label>TEAM:</label>
                    <h5>{{ team.name }}</h5>
                </div>
            </div>
        </template>
        <template v-slot:default>
            <ul>
                <ff-dropdown-option>
                    <nav-item v-for="t in teams" :key="t.id" :label="t.name" :avatar="t?.avatar" @click="selectTeam(t)" data-action="switch-team"></nav-item>
                </ff-dropdown-option>
                <ff-dropdown-option>
                    <nav-item label="Create New Team" :icon="plusIcon" @click="createTeam(t);" data-action="create-team"> </nav-item>
                </ff-dropdown-option>
            </ul>
        </template>
    </ff-dropdown>
</template>

<script>
import { mapState } from 'vuex'

import { PlusIcon } from '@heroicons/vue/solid'
import NavItem from '@/components/NavItem'

export default {
    name: 'FFTeamSelection',
    emits: ['option-selected'],
    components: {
        NavItem
    },
    computed: {
        ...mapState('account', ['team', 'teams'])
    },
    data () {
        return {
            plusIcon: PlusIcon
        }
    },
    methods: {
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
        }
    }
}
</script>
