<template>
    <ff-listbox v-if="hasAvailableTeams" :options="teamOptions" v-model="selection" class="ff-team-selection">
        <template #button>
            <ListboxButton>
                <div v-if="team" class="flex grow items-center">
                    <img alt="team-icon" :src="team.avatar" class="ff-avatar">
                    <div class="ff-team-selection-name">
                        <label>TEAM:</label>
                        <h5>{{ team.name }}</h5>
                    </div>
                </div>
                <div v-else class="flex grow items-center">
                    <div class="ff-team-selection-name">
                        <h5>Select a team</h5>
                    </div>
                </div>
            </ListboxButton>
        </template>
        <template #options="{options}">
            <ListboxOption
                v-for="option in options"
                v-slot="{ active, selected }"
                :key="option.label"
                :value="option"
                as="template"
                class="ff-option ff-team-selection-option"
                :class="{'create-new': option.value === 'create-new-team'}"
                :data-option="option.label"
                :title="option.label"
            >
                <li>
                    <div class="ff-option-content" :class="{selected, active}">
                        <img alt="team-icon" v-if="option.avatar" :src="option.avatar" class="ff-avatar">
                        <component v-if="option.icon" :is="PlusIcon" class="ff-icon transition-fade&#45;&#45;color" />
                        <span>{{ option.label }}</span>
                    </div>
                </li>
            </ListboxOption>
        </template>
    </ff-listbox>
</template>

<script>
import {
    ListboxButton,
    ListboxOption
} from '@headlessui/vue'
import { PlusIcon } from '@heroicons/vue/solid'
import { mapGetters, mapState } from 'vuex'

import NavItem from './NavItem.vue'

export default {
    name: 'FFTeamSelection',
    emits: ['option-selected'],
    components: {
        NavItem,
        ListboxOption,
        ListboxButton
    },
    setup () {
        return { PlusIcon }
    },
    computed: {
        ...mapState('account', ['team', 'teams', 'settings']),
        ...mapGetters('account', ['hasAvailableTeams', 'canCreateTeam']),
        teamOptions () {
            return [
                ...this.teams.map(team => {
                    return { label: team.name, value: team.slug, avatar: team.avatar }
                }),
                (
                    this.canCreateTeam
                        ? { label: 'Create New Team', value: 'create-new-team', icon: PlusIcon }
                        : undefined
                )
            ].filter(v => v)
        }
    },
    data () {
        return {
            selection: this.team?.slug ?? null
        }
    },
    watch: {
        selection (value) {
            if (value === 'create-new-team') {
                return this.createTeam()
            } else {
                return this.selectTeam({ slug: value })
            }
        }
    },
    methods: {
        selectTeam (team) {
            if (team) {
                this.$store.dispatch('account/setTeam', team.slug)
                    .then(() => this.$router.push({
                        name: 'Team',
                        params: {
                            team_slug: team.slug
                        }
                    }))
                    .catch(e => console.warn(e))
            }
        },
        createTeam () {
            return this.$router.push({
                name: 'CreateTeam'
            })
        }
    }
}
</script>
<style lang="scss">
@import "../stylesheets/components/team-list.scss";

.ff-team-selection {
    &.ff-listbox {
        button {
            background: $ff-grey-800;
            border-radius: 0;
            border: none;

            button {
                padding-left: 13px;

            }
            .icon {
                svg {
                    color: $ff-white;
                }
            }
        }
    }
}
.ff-options .ff-team-selection-option {
    background-color: $ff-grey-700;
    border-color: $ff-grey-800;
    color: $ff-white;
    border-bottom: 1px solid #4B5563;
    display: flex;
    align-items: center;
    height: 60px;

    &.create-new {
        background-color: $ff-grey-900;
    }

    .ff-option-content {
        padding: 16px 16px 16px 22px;
        display: flex;
        align-items: center;
        gap: 15px;
        width: 100%;

        &.selected {
            background: $ff-grey-800;
        }
    }

    &:hover {
        background-color: $ff-grey-800;
        color: $ff-teal-100;
    }
}

</style>
