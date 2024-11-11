import {
    BookOpenIcon, ChatIcon, ChipIcon, CogIcon, CollectionIcon,
    ColorSwatchIcon, CurrencyDollarIcon, DatabaseIcon,
    DesktopComputerIcon, LockClosedIcon, RssIcon,
    TemplateIcon, UserGroupIcon, UsersIcon
} from '@heroicons/vue/outline'

import ProjectsIcon from '../components/icons/Projects.js'
import usePermissions from '../composables/Permissions.js'
import { Roles } from '../utils/roles.js'

const state = () => ({
    leftDrawer: {
        state: false,
        component: null
    },
    rightDrawer: {
        state: false,
        component: null
    },
    tours: {
        welcome: false,
        education: false
    },
    mainNav: {
        context: 'team',
        backToButton: null
    }
})

const getters = {
    hiddenLeftDrawer: (state, getters) => {
        return state.leftDrawer.component?.name === 'MainNav' && getters.mainNavContext.length === 0
    },
    shouldShowEducationModal: (state) => {
        return state.tours.education
    },
    mainNavContexts: function (state, getters, rootState, rootGetters) {
        const { hasALowerOrEqualTeamRoleThan, hasAMinimumTeamRoleOf, hasPermission } = usePermissions()
        const team = rootState.account.team
        const teamMembership = rootState.account.teamMembership
        const accountFeatures = rootState.account.features
        const noBilling = rootGetters['account/noBilling']
        const features = rootGetters['account/featuresCheck']
        return {
            team: [
                {
                    title: '',
                    hidden: !hasAMinimumTeamRoleOf(Roles.Viewer, teamMembership),
                    entries: [
                        {
                            label: 'Applications',
                            to: { name: 'Applications', params: { team_slug: team.slug } },
                            tag: 'team-applications',
                            icon: TemplateIcon,
                            disabled: noBilling
                        }
                    ]
                },
                {
                    title: 'Instances',
                    hidden: !hasAMinimumTeamRoleOf(Roles.Viewer, teamMembership),
                    entries: [
                        {
                            label: 'Hosted Instances',
                            to: { name: 'Instances', params: { team_slug: team.slug } },
                            tag: 'team-instances',
                            icon: ProjectsIcon,
                            disabled: noBilling
                        },
                        {
                            label: 'Edge Devices',
                            to: { name: 'TeamDevices', params: { team_slug: team.slug } },
                            tag: 'team-devices',
                            icon: ChipIcon,
                            disabled: noBilling
                        }
                    ]
                },
                {
                    title: 'Operations',
                    hidden: !hasAMinimumTeamRoleOf(Roles.Viewer, teamMembership),
                    entries: [
                        {
                            label: 'Broker',
                            to: { name: 'TeamBroker', params: { team_slug: team.slug } },
                            tag: 'team-broker',
                            icon: RssIcon,
                            disabled: noBilling,
                            featureUnavailable: !features.isMqttBrokerFeatureEnabled,
                            hidden: hasALowerOrEqualTeamRoleThan(Roles.Member, teamMembership) && features.isMqttBrokerFeatureEnabledForPlatform
                        }
                    ]
                },
                {
                    title: 'Team Management',
                    hidden: !hasAMinimumTeamRoleOf(Roles.Viewer, teamMembership),
                    entries: [
                        {
                            label: 'Library',
                            to: { name: 'TeamLibrary', params: { team_slug: team.slug } },
                            tag: 'shared-library',
                            icon: BookOpenIcon,
                            disabled: noBilling,
                            featureUnavailable: !features.isSharedLibraryFeatureEnabledForPlatform || !features.isSharedLibraryFeatureEnabledForTeam
                        },
                        {
                            label: 'Members',
                            to: { name: 'team-members', params: { team_slug: team.slug } },
                            tag: 'team-members',
                            icon: UsersIcon,
                            disabled: noBilling
                        }
                    ]
                },
                {
                    title: 'Team Admin',
                    hidden: !hasAMinimumTeamRoleOf(Roles.Viewer, teamMembership),
                    permission: '',
                    entries: [
                        {
                            label: 'Audit Log',
                            to: { name: 'AuditLog', params: { team_slug: team.slug } },
                            tag: 'team-audit',
                            icon: DatabaseIcon,
                            disabled: noBilling,
                            permission: 'team:edit'
                        },
                        {
                            label: 'Billing',
                            to: { name: 'Billing', params: { team_slug: team.slug } },
                            tag: 'team-billing',
                            icon: CurrencyDollarIcon,
                            hidden: (() => {
                                // hide menu entry for non-billing setups
                                if (noBilling) {
                                    return true
                                }

                                // team members that are part of teams that have suspended/no billing setup are forcibly redirected
                                // to the billing page (even if they don't have permissions to normally access the billing page)
                                return !!accountFeatures?.billing && hasPermission('team:edit', teamMembership)
                            })()
                        },
                        {
                            label: 'Team Settings',
                            to: { name: 'TeamSettings', params: { team_slug: team.slug } },
                            tag: 'team-settings',
                            icon: CogIcon,
                            permission: 'team:edit'
                        }
                    ]
                }
            ],
            admin: [
                {
                    entries: [
                        state.mainNav.backToButton
                    ]
                },
                {
                    title: 'Admin',
                    entries: [
                        {
                            label: 'Overview',
                            to: { name: 'admin-overview' },
                            tag: 'admin-overview',
                            icon: CollectionIcon
                        },
                        {
                            label: 'Users',
                            to: { name: 'admin-users' },
                            tag: 'admin-users',
                            icon: UsersIcon
                        },
                        {
                            label: 'Teams',
                            to: { name: 'admin-teams' },
                            tag: 'admin-teams',
                            icon: UserGroupIcon
                        },
                        {
                            label: 'Audit Log',
                            to: { name: 'admin-audit-logs' },
                            tag: 'admin-auditlog',
                            icon: DatabaseIcon
                        },
                        {
                            label: 'Notifications Hub',
                            to: { name: 'admin-notifications-hub' },
                            tag: 'notifications-hub',
                            icon: ChatIcon
                        }
                    ]
                },
                {
                    title: 'Setup',
                    entries: [
                        {
                            label: 'Team Types',
                            to: { name: 'admin-team-types' },
                            tag: 'admin-teamtypes',
                            icon: ColorSwatchIcon
                        },
                        {
                            label: 'Instance Types',
                            to: { name: 'admin-instance-types' },
                            tag: 'admin-instancetypes',
                            icon: ColorSwatchIcon
                        },
                        {
                            label: 'Stacks',
                            to: { name: 'admin-stacks' },
                            tag: 'admin-stacks',
                            icon: DesktopComputerIcon
                        },
                        {
                            label: 'Templates',
                            to: { name: 'admin-templates' },
                            tag: 'admin-templates',
                            icon: TemplateIcon
                        },
                        {
                            label: 'Blueprints',
                            to: { name: 'admin-flow-blueprints' },
                            tag: 'admin-flow-blueprints',
                            icon: TemplateIcon,
                            featureUnavailable: !features.isBlueprintsFeatureEnabledForPlatform
                        }
                    ]
                },
                {
                    title: 'General',
                    entries: [
                        {
                            label: 'Settings',
                            to: { name: 'admin-settings' },
                            tag: 'admin-settings',
                            icon: CogIcon
                        }
                    ]
                }
            ],
            user: [
                {
                    entries: [
                        state.mainNav.backToButton
                    ]
                },
                {
                    title: 'User Settings',
                    entries: [
                        {
                            label: 'Settings',
                            to: { name: 'user-settings-overview' },
                            tag: 'account-settings',
                            icon: CogIcon
                        },
                        {
                            label: 'Teams',
                            to: { name: 'user-settings-teams' },
                            tag: 'account-teams',
                            icon: UserGroupIcon
                        },
                        {
                            label: 'Security',
                            to: { name: 'user-settings-security' },
                            tag: 'account-security',
                            icon: LockClosedIcon
                        }
                    ]
                }
            ],
            back: [
                {
                    entries: [
                        state.mainNav.backToButton
                    ]
                }
            ]
        }
    },
    mainNavContext: (state, getters, rootState) => {
        const team = rootState.account.team

        if (!team) {
            // todo this compensates for a brief moment after logging in where we don't have a team loaded and can't properly
            //  generate menu links. This should be addressed by implementing an application service that bootstrap's the
            //  app and hydrates vuex stores before attempting to render any data
            return []
        }

        const { hasPermission } = usePermissions()
        const teamMembership = rootState.account.teamMembership

        return getters.mainNavContexts[state.mainNav.context]
            .map(category => {
                // filter hidden entries
                category.entries = category.entries.filter(entry => entry.hidden ?? true)

                // filter entries without permission
                category.entries = category.entries.filter(entry => {
                    const hasPermissionKey = Object.prototype.hasOwnProperty.call(entry, 'permission')
                    if (hasPermissionKey && entry.permission.length > 0) {
                        return hasPermission(entry.permission, teamMembership)
                    } return true
                })

                return category
            })
            .filter(category => { // filter categories without permission
                const hasPermissionKey = Object.prototype.hasOwnProperty.call(category, 'permission')
                if (hasPermissionKey && category.permission.length > 0) {
                    return hasPermission(category.permission, teamMembership)
                } return true
            })
            .filter(category => Object.prototype.hasOwnProperty.call(category, 'hidden') ? !category.hidden : true) // filter hidden categories
            .filter(category => category.entries.length > 0) // filter categories without entries
    }
}

const mutations = {
    openRightDrawer (state, { component }) {
        state.rightDrawer.state = true
        state.rightDrawer.component = component
    },
    closeRightDrawer (state) {
        state.rightDrawer.state = false
        state.rightDrawer.component = null
    },
    openLeftDrawer (state) {
        state.leftDrawer.state = true
    },
    closeLeftDrawer (state) {
        state.leftDrawer.state = false
    },
    toggleLeftDrawer (state) {
        state.leftDrawer.state = !state.leftDrawer.state
    },
    setLeftDrawer (state, component) {
        state.leftDrawer.component = component
    },
    setMainNavContext (state, context) {
        state.mainNav.context = context
    },
    setMainNavBackButton (state, button) {
        state.mainNav.backToButton = button
    },
    activateTour (state, tour) {
        state.tours[tour] = true
    },
    deactivateTour (state, tour) {
        state.tours[tour] = false
    }
}

const actions = {
    openRightDrawer ({ commit }, { component }) {
        commit('openRightDrawer', { component })
    },
    closeRightDrawer ({ commit }) {
        commit('closeRightDrawer')
    },
    openLeftDrawer ({ commit }) {
        commit('openLeftDrawer')
    },
    closeLeftDrawer ({ commit }) {
        commit('closeLeftDrawer')
    },
    toggleLeftDrawer ({ commit }) {
        commit('toggleLeftDrawer')
    },
    setLeftDrawer ({ commit }, component) {
        commit('setLeftDrawer', component)
    },
    setMainNavContext ({ commit }, context) {
        commit('setMainNavContext', context)
    },
    setMainNavBackButton ({ commit }, button) {
        commit('setMainNavBackButton', button)
    },
    activateTour ({ commit }, tour) {
        commit('activateTour', tour)
    },
    deactivateTour ({ commit, state }, tour) {
        if (tour === 'welcome') {
            commit('activateTour', 'education')
        }
        commit('deactivateTour', tour)
    }
}

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions,
    meta: {
        persistence: {
            tours: {
                storage: 'localStorage'
            }
        }
    }
}
