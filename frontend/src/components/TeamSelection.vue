<template>
    <ff-dropdown v-if="team" class="ff-team-selection">
        <template #placeholder>
            <div class="flex grow items-center">
                <img :src="team.avatar" class="ff-avatar">
                <div class="ff-team-selection-name">
                    <label>TEAM:</label>
                    <h5>{{ team.name }}</h5>
                </div>
            </div>
        </template>
        <template #default>
            <ul class="ff-dropdown-option-list">
                <ff-dropdown-option>
                    <nav-item v-for="t in teams" :key="t.id" :label="t.name" :avatar="t?.avatar" @click="selectTeam(t)" data-action="switch-team" />
                </ff-dropdown-option>
                <ff-dropdown-option v-if="canCreateTeam">
                    <nav-item label="Create New Team" :icon="plusIcon" @click="createTeam(t);" data-action="create-team" />
                </ff-dropdown-option>
            </ul>
        </template>
    </ff-dropdown>
</template>

<script>
import { PlusIcon } from '@heroicons/vue/solid'
import { mapGetters, mapState } from 'vuex'

import NavItem from './NavItem.vue'

export default {
    name: 'FFTeamSelection',
    emits: ['option-selected'],
    components: {
        NavItem
    },
    computed: {
        ...mapState('account', ['team', 'teams', 'settings']),
        ...mapGetters('account', ['isAdminUser']),
        canCreateTeam () {
            if (this.isAdminUser) {
                return true
            }

            return Object.prototype.hasOwnProperty.call(this.settings, 'team:create') && this.settings['team:create']
        }
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
<style lang="scss">

@import "../stylesheets/components/team-list.scss";

</style>
