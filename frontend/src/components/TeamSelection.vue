<template>
    <ff-listbox v-if="hasAvailableTeams" :options="teamOptions" v-model="selection" class="ff-team-selection">
        <template #button>
            <ListboxButton>
                <div v-if="team" class="flex grow items-center">
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
                    <div class="ff-option-content truncate" :class="{selected, active}">
                        <component v-if="option.icon" :is="option.icon" class="ff-icon transition-fade" />
                        <span class="truncate">{{ option.label }}</span>
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
import { PlusIcon, UserAddIcon } from '@heroicons/vue/solid'
import { mapGetters, mapState } from 'vuex'

import usePermissions from '../composables/Permissions.js'

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
        const { hasPermission } = usePermissions()
        return { PlusIcon, UserAddIcon, hasPermission }
    },
    computed: {
        ...mapState('account', ['team', 'teams', 'settings']),
        ...mapGetters('account', ['hasAvailableTeams', 'canCreateTeam']),
        teamOptions () {
            return [
                ...this.teams.map(team => {
                    return { label: team.name, value: team.slug }
                }),
                (
                    this.team && this.hasPermission('team:user:invite')
                        ? { label: 'Invite Members', value: 'invite-members', icon: UserAddIcon }
                        : undefined
                ),
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
            selection: this.$route.params.team_slug ?? null,
            loaded: false
        }
    },
    watch: {
        selection (value) {
            if (value === 'create-new-team') {
                return this.createTeam()
            } else if (value === 'invite-members') {
                return this.inviteMembers()
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
        },
        inviteMembers () {
            return this.$router.push({
                name: 'team-members',
                params: { team_slug: this.team.slug },
                query: { action: 'invite' }
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
            border-radius: 0;
            border: none;
            background: none;

            button {
                padding: 0;

            }
            .icon {
                svg {
                    color: $ff-grey-800;
                    width: 80%;
                    padding-left: 10px;
                }
            }
        }
    }
}
.ff-options .ff-team-selection-option {
    border-color: $ff-color--border;
    color: $ff-grey-800;
    border-bottom: 1px solid $ff-color--border;
    display: flex;
    align-items: center;

    .ff-option-content {
        padding: 12px 12px 12px 18px;
        display: flex;
        align-items: center;
        gap: 15px;
        width: 100%;

        &.selected {
            background: $ff-grey-200;
        }

        .ff-icon {
            width: 1.25rem;
            height: 1.25rem;
        }
    }
}

</style>
