import {
    BookOpenIcon, ChatIcon, ChevronLeftIcon, ChipIcon, CogIcon, CollectionIcon,
    ColorSwatchIcon, CurrencyDollarIcon, DatabaseIcon,
    DesktopComputerIcon, LockClosedIcon, RssIcon,
    TableIcon, TemplateIcon, UserGroupIcon, UsersIcon
} from '@heroicons/vue/outline'

import DeviceGroupOutlineIcon from '../../../components/icons/DeviceGroupOutline.js'
import PipelinesIcon from '../../../components/icons/Pipelines.js'
import ProjectsIcon from '../../../components/icons/Projects.js'
import usePermissions from '../../../composables/Permissions.js'
import { Roles } from '../../../utils/roles.js'

import tours from './tours/index.js'

const initialState = () => ({
    leftDrawer: {
        state: false,
        component: null
    },
    rightDrawer: {
        state: false,
        component: null
    },
    mainNav: {
        context: 'team',
        backToButton: null
    },
    userActions: {
        hasOpenedDeviceEditor: false
    },
    isNewlyCreatedUser: false
})

const meta = {
    persistence: {
        isNewlyCreatedUser: {
            storage: 'localStorage'
        },
        userActions: {
            storage: 'localStorage'
        }
    }
}

const state = initialState

const getters = {
    hiddenLeftDrawer: (state, getters) => {
        return state.leftDrawer.component?.name === 'MainNav' && getters.mainNavContext.length === 0
    },
    mainNavContexts: function (state, getters, rootState, rootGetters) {
        const { hasALowerOrEqualTeamRoleThan, hasAMinimumTeamRoleOf, hasPermission } = usePermissions()
        const team = rootState.account.team
        const accountFeatures = rootState.account.features
        const requiresBilling = rootGetters['account/requiresBilling']
        const features = rootGetters['account/featuresCheck']

        const adminContext = [
            {
                entries: [
                    {
                        label: 'Back to Dashboard',
                        to: { name: 'Home' },
                        tag: 'back',
                        icon: ChevronLeftIcon
                    }
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
        ]

        const userContext = [
            {
                entries: [
                    {
                        label: 'Back to Dashboard',
                        to: { name: 'Home' },
                        tag: 'back',
                        icon: ChevronLeftIcon
                    }
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
        ]

        const teamContext = team
            ? [
                {
                    title: '',
                    hidden: !hasAMinimumTeamRoleOf(Roles.Viewer),
                    entries: [
                        {
                            label: 'Applications',
                            to: {
                                name: 'Applications',
                                params: { team_slug: team.slug }
                            },
                            tag: 'team-applications',
                            icon: TemplateIcon,
                            disabled: requiresBilling
                        }
                    ]
                },
                {
                    title: 'Instances',
                    hidden: !hasAMinimumTeamRoleOf(Roles.Viewer),
                    entries: [
                        {
                            label: 'Hosted Instances',
                            to: {
                                name: 'Instances',
                                params: { team_slug: team.slug }
                            },
                            tag: 'team-instances',
                            icon: ProjectsIcon,
                            featureUnavailable: !features.isHostedInstancesEnabledForTeam,
                            disabled: requiresBilling
                        },
                        {
                            label: 'Remote Instances',
                            to: {
                                name: 'TeamDevices',
                                params: { team_slug: team.slug }
                            },
                            tag: 'team-devices',
                            icon: ChipIcon,
                            disabled: requiresBilling,
                            alert: state.isNewlyCreatedUser && !state.userActions.hasOpenedDeviceEditor
                                ? {
                                    title: 'Connect to Device Agent',
                                    url: 'https://flowfuse.com/docs/device-agent/introduction/'
                                }
                                : null
                        }
                    ]
                },
                {
                    title: 'Operations',
                    hidden: !hasAMinimumTeamRoleOf(Roles.Viewer),
                    entries: [
                        {
                            label: 'Groups',
                            to: {
                                name: 'device-groups',
                                params: { team_slug: team.slug }
                            },
                            tag: 'device-groups',
                            icon: DeviceGroupOutlineIcon,
                            disabled: requiresBilling,
                            featureUnavailable: !features.isDeviceGroupsFeatureEnabled,
                            hidden: hasALowerOrEqualTeamRoleThan(Roles.Member)
                        },
                        {
                            label: 'Pipelines',
                            to: {
                                name: 'team-pipelines',
                                params: { team_slug: team.slug }
                            },
                            tag: 'team-pipelines',
                            icon: PipelinesIcon,
                            disabled: requiresBilling,
                            featureUnavailable: !features.devOpsPipelinesFeatureEnabled,
                            hidden: hasALowerOrEqualTeamRoleThan(Roles.Member)
                        },
                        {
                            label: 'Bill Of Materials',
                            to: {
                                name: 'team-bom',
                                params: { team_slug: team.slug }
                            },
                            tag: 'team-bom',
                            icon: TableIcon,
                            disabled: requiresBilling,
                            featureUnavailable: !features.isBOMFeatureEnabled,
                            hidden: hasALowerOrEqualTeamRoleThan(Roles.Owner)
                        },
                        {
                            label: 'Brokers',
                            to: { name: 'team-brokers', params: { team_slug: team.slug } },
                            tag: 'team-brokers',
                            icon: RssIcon,
                            disabled: requiresBilling,
                            featureUnavailable: !features.isMqttBrokerFeatureEnabled,
                            hidden: hasALowerOrEqualTeamRoleThan(Roles.Member) && features.isMqttBrokerFeatureEnabledForPlatform
                        }
                    ]
                },
                {
                    title: 'Team Management',
                    hidden: !hasAMinimumTeamRoleOf(Roles.Viewer),
                    entries: [
                        {
                            label: 'Library',
                            to: {
                                name: 'TeamLibrary',
                                params: { team_slug: team.slug }
                            },
                            tag: 'shared-library',
                            icon: BookOpenIcon,
                            disabled: requiresBilling,
                            featureUnavailable: !features.isSharedLibraryFeatureEnabledForPlatform || !features.isSharedLibraryFeatureEnabledForTeam
                        },
                        {
                            label: 'Members',
                            to: {
                                name: 'team-members',
                                params: { team_slug: team.slug }
                            },
                            tag: 'team-members',
                            icon: UsersIcon,
                            disabled: requiresBilling
                        }
                    ]
                },
                {
                    title: 'Team Admin',
                    hidden: !hasAMinimumTeamRoleOf(Roles.Viewer),
                    permission: '',
                    entries: [
                        {
                            label: 'Audit Log',
                            to: {
                                name: 'AuditLog',
                                params: { team_slug: team.slug }
                            },
                            tag: 'team-audit',
                            icon: DatabaseIcon,
                            disabled: requiresBilling,
                            permission: 'team:edit'
                        },
                        {
                            label: 'Billing',
                            to: {
                                name: 'Billing',
                                params: { team_slug: team.slug }
                            },
                            tag: 'team-billing',
                            icon: CurrencyDollarIcon,
                            hidden: (() => {
                                // hide menu entry for non-billing setups
                                if (requiresBilling) {
                                    return true
                                }

                                // team members that are part of teams that have suspended/no billing setup are forcibly redirected
                                // to the billing page (even if they don't have permissions to normally access the billing page)
                                return !!accountFeatures?.billing && hasPermission('team:edit')
                            })()
                        },
                        {
                            label: 'Team Settings',
                            to: {
                                name: 'TeamSettings',
                                params: { team_slug: team.slug }
                            },
                            tag: 'team-settings',
                            icon: CogIcon,
                            permission: 'team:edit'
                        }
                    ]
                }
            ]
            : []

        const backContext = team
            ? [
                {
                    entries: [
                        state.mainNav.backToButton
                    ]
                }
            ]
            : []

        return {
            team: teamContext,
            admin: adminContext,
            user: userContext,
            back: backContext,
            none: []
        }
    },
    mainNavContext: (state, getters, rootState) => {
        const team = rootState.account.team

        if (!team && !['admin', 'user'].includes(state.mainNav.context)) {
            // todo this compensates for a brief moment after logging in where we don't have a team loaded and can't properly
            //  generate menu links. This should be addressed by implementing an application service that bootstrap's the
            //  app and hydrates vuex stores before attempting to render any data
            return []
        }

        const { hasPermission } = usePermissions()

        return getters.mainNavContexts[state.mainNav.context]
            .map(category => {
                // filter hidden entries
                category.entries = category.entries.filter(entry => (!!entry && entry?.hidden) ?? true)

                // filter entries without permission
                category.entries = category.entries.filter(entry => {
                    const hasPermissionKey = Object.prototype.hasOwnProperty.call(entry, 'permission')
                    if (hasPermissionKey && entry.permission.length > 0) {
                        return hasPermission(entry.permission)
                    } return true
                })

                return category
            })
            .filter(category => { // filter categories without permission
                const hasPermissionKey = Object.prototype.hasOwnProperty.call(category, 'permission')
                if (hasPermissionKey && category.permission.length > 0) {
                    return hasPermission(category.permission)
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
    setNewlyCreatedUser (state, payload) {
        state.isNewlyCreatedUser = payload
    },
    setUserAction (state, { action, payload }) {
        if (Object.prototype.hasOwnProperty.call(state.userActions, action)) {
            state.userActions[action] = payload
        }
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
    setNewlyCreatedUser ({ commit }) {
        commit('setNewlyCreatedUser', true)
    },
    validateUserAction ({ commit }, action) {
        commit('setUserAction', { action, payload: true })
    },
    checkIfIsNewlyCreatedUser ({ commit }, user) {
        const userCreatedDate = new Date(user.createdAt).getTime()
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        commit('setNewlyCreatedUser', userCreatedDate >= oneWeekAgo.getTime())
    }
}

export default {
    namespaced: true,
    modules: { tours },
    state,
    initialState: initialState(),
    getters,
    mutations,
    actions,
    meta
}
