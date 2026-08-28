import {
    BookOpenIcon, ChartBarIcon, ChartPieIcon, ChatBubbleOvalLeftEllipsisIcon, ChevronLeftIcon, CircleStackIcon, Cog8ToothIcon,
    ComputerDesktopIcon, CpuChipIcon, CurrencyDollarIcon,
    HomeIcon, LockClosedIcon, RectangleGroupIcon, RectangleStackIcon,
    RssIcon, SwatchIcon, TableCellsIcon, UserGroupIcon, UsersIcon
} from '@heroicons/vue/24/outline'
import { defineStore } from 'pinia'

import DeviceGroupOutlineIcon from '../components/icons/DeviceGroupOutline.js'
import PipelinesIcon from '../components/icons/Pipelines.js'
import ProjectsIcon from '../components/icons/Projects.js'
import QueueIcon from '../components/icons/Queue.js'
import { hasALowerOrEqualTeamRoleThan, hasAMinimumTeamRoleOf, hasPermission } from '../composables/Permissions.js'
import i18n from '../i18n.js'
import { Roles } from '../utils/roles.js'

import { useAccountSettingsStore } from './account-settings.js'
import { useContextStore } from './context.js'
import { useUxStore } from './ux.js'

/**
 * Nav labels are read through the active locale.
 *
 * These getters are computed, and `t` reads the locale ref, so switching
 * language re-renders the sidebar without a reload.
 */
const t = key => i18n.global.t(key)

export const useUxNavigationStore = defineStore('ux-navigation', {
    state: () => ({
        mainNav: {
            context: 'team',
            backToButton: null
        }
    }),
    getters: {
        mainNavContexts (state) {
            const contextStore = useContextStore()
            const team = contextStore.team
            const teamMembership = contextStore.teamMembership
            const isTrialAccountExpired = contextStore.isTrialAccountExpired

            const accountSettingsStore = useAccountSettingsStore()
            const accountFeatures = accountSettingsStore.features
            const features = accountSettingsStore.featuresCheck
            const requiresBilling = accountSettingsStore.requiresBilling

            const uxStore = useUxStore()
            const isNewlyCreatedUser = uxStore.isNewlyCreatedUser
            const userActions = uxStore.userActions

            const adminContext = [
                {
                    entries: [
                        {
                            label: t('nav.backToDashboard'),
                            to: { name: 'home' },
                            tag: 'back',
                            icon: ChevronLeftIcon
                        }
                    ]
                },
                {
                    title: t('nav.sectionAdmin'),
                    entries: [
                        {
                            label: t('nav.overview'),
                            to: { name: 'admin-overview' },
                            tag: 'admin-overview',
                            icon: RectangleStackIcon
                        },
                        {
                            label: t('nav.users'),
                            to: { name: 'admin-users' },
                            tag: 'admin-users',
                            icon: UsersIcon
                        },
                        {
                            label: t('nav.teams'),
                            to: { name: 'admin-teams' },
                            tag: 'admin-teams',
                            icon: UserGroupIcon
                        },
                        {
                            label: t('nav.auditLog'),
                            to: { name: 'admin-audit-logs' },
                            tag: 'admin-auditlog',
                            icon: QueueIcon
                        },
                        {
                            label: t('nav.notificationsHub'),
                            to: { name: 'admin-notifications-hub' },
                            tag: 'notifications-hub',
                            icon: ChatBubbleOvalLeftEllipsisIcon
                        }
                    ]
                },
                {
                    title: t('nav.sectionSetup'),
                    entries: [
                        {
                            label: t('nav.teamTypes'),
                            to: { name: 'admin-team-types' },
                            tag: 'admin-teamtypes',
                            icon: SwatchIcon
                        },
                        {
                            label: t('nav.instanceTypes'),
                            to: { name: 'admin-instance-types' },
                            tag: 'admin-instancetypes',
                            icon: SwatchIcon
                        },
                        {
                            label: t('nav.stacks'),
                            to: { name: 'admin-stacks' },
                            tag: 'admin-stacks',
                            icon: ComputerDesktopIcon
                        },
                        {
                            label: t('nav.templates'),
                            to: { name: 'admin-templates' },
                            tag: 'admin-templates',
                            icon: RectangleGroupIcon
                        },
                        {
                            label: t('nav.blueprints'),
                            to: { name: 'admin-flow-blueprints' },
                            tag: 'admin-flow-blueprints',
                            icon: RectangleGroupIcon,
                            featureUnavailable: !features.isBlueprintsFeatureEnabledForPlatform
                        },
                        {
                            label: t('nav.flowfuseNodes'),
                            to: { name: 'admin-certified-nodes' },
                            tag: 'admin-certified-nodes',
                            icon: RectangleStackIcon,
                            hidden: features.isCertifiedNodesFeatureEnabledForPlatform
                        }
                    ]
                },
                {
                    title: t('nav.sectionGeneral'),
                    entries: [
                        {
                            label: t('nav.settings'),
                            to: { name: 'admin-settings' },
                            tag: 'admin-settings',
                            icon: Cog8ToothIcon
                        }
                    ]
                }
            ]

            const userContext = [
                {
                    entries: [
                        {
                            label: t('nav.backToDashboard'),
                            to: { name: 'home' },
                            tag: 'back',
                            icon: ChevronLeftIcon
                        }
                    ]
                },
                {
                    title: t('nav.userSettings'),
                    entries: [
                        {
                            label: t('nav.settings'),
                            to: { name: 'user-settings-overview' },
                            tag: 'account-settings',
                            icon: Cog8ToothIcon
                        },
                        {
                            label: t('nav.teams'),
                            to: { name: 'user-settings-teams' },
                            tag: 'account-teams',
                            icon: UserGroupIcon
                        },
                        {
                            label: t('nav.security'),
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
                        hidden: !hasAMinimumTeamRoleOf(Roles.Viewer, teamMembership),
                        entries: [
                            {
                                label: t('nav.home'),
                                to: {
                                    name: 'team-home',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'team-home',
                                icon: HomeIcon,
                                disabled: requiresBilling
                            }
                        ]
                    },
                    {
                        title: t('nav.sectionInstances'),
                        hidden: !hasAMinimumTeamRoleOf(Roles.Viewer, teamMembership),
                        entries: [
                            {
                                label: t('nav.hostedInstances'),
                                to: {
                                    name: 'team-hosted-instances',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'team-instances',
                                icon: ProjectsIcon,
                                featureUnavailable: !features.isHostedInstancesEnabledForTeam,
                                disabled: requiresBilling
                            },
                            {
                                label: t('nav.remoteInstances'),
                                to: {
                                    name: 'team-remote-instances',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'team-devices',
                                icon: CpuChipIcon,
                                disabled: requiresBilling,
                                alert: isNewlyCreatedUser && !userActions.hasOpenedDeviceEditor
                                    ? {
                                        title: t('nav.connectDeviceAgent'),
                                        url: 'https://flowfuse.com/docs/device-agent/introduction/'
                                    }
                                    : null
                            }
                        ]
                    },
                    {
                        title: t('nav.sectionOperations'),
                        hidden: !hasAMinimumTeamRoleOf(Roles.Viewer, teamMembership),
                        entries: [
                            {
                                label: t('nav.applications'),
                                to: {
                                    name: 'team-applications',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'team-applications',
                                icon: RectangleGroupIcon,
                                disabled: requiresBilling
                            },
                            {
                                label: t('nav.dashboards'),
                                to: {
                                    name: 'team-dashboards',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'team-dashboards',
                                icon: ChartPieIcon,
                                disabled: requiresBilling
                            },
                            {
                                label: t('nav.groups'),
                                to: {
                                    name: 'device-groups',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'device-groups',
                                icon: DeviceGroupOutlineIcon,
                                disabled: requiresBilling,
                                featureUnavailable: !features.isDeviceGroupsFeatureEnabled,
                                hidden: hasALowerOrEqualTeamRoleThan(Roles.Member, teamMembership)
                            },
                            {
                                label: t('nav.pipelines'),
                                to: {
                                    name: 'team-pipelines',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'team-pipelines',
                                icon: PipelinesIcon,
                                disabled: requiresBilling,
                                featureUnavailable: !features.isDevOpsPipelinesFeatureEnabled,
                                hidden: hasALowerOrEqualTeamRoleThan(Roles.Member, teamMembership)
                            },
                            {
                                label: t('nav.billOfMaterials'),
                                to: {
                                    name: 'team-bom',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'team-bom',
                                icon: TableCellsIcon,
                                disabled: requiresBilling,
                                featureUnavailable: !features.isBOMFeatureEnabled,
                                hidden: hasALowerOrEqualTeamRoleThan(Roles.Owner, teamMembership)
                            },
                            {
                                label: t('nav.brokers'),
                                to: { name: 'team-brokers', params: { team_slug: team.slug } },
                                tag: 'team-brokers',
                                icon: RssIcon,
                                disabled: requiresBilling,
                                featureUnavailable: !features.isMqttBrokerFeatureEnabled,
                                hidden: hasALowerOrEqualTeamRoleThan(Roles.Member, teamMembership) && features.isMqttBrokerFeatureEnabledForPlatform
                            },
                            {
                                label: t('nav.performance'),
                                to: { name: 'team-performance', params: { team_slug: team.slug } },
                                tag: 'team-performance',
                                icon: ChartBarIcon,
                                disabled: requiresBilling,
                                featureUnavailable: !features.isInstanceResourcesFeatureEnabled,
                                hidden: hasALowerOrEqualTeamRoleThan(Roles.Member, teamMembership) && features.isInstanceResourcesFeatureEnabledForPlatform
                            },
                            {
                                label: t('nav.tables'),
                                to: { name: 'team-tables', params: { team_slug: team.slug } },
                                tag: 'team-tables',
                                icon: CircleStackIcon,
                                disabled: requiresBilling,
                                featureUnavailable: !features.isTablesFeatureEnabled,
                                hidden: hasALowerOrEqualTeamRoleThan(Roles.Member, teamMembership) && features.isTablesFeatureEnabledForPlatform
                            }
                        ]
                    },
                    {
                        title: t('nav.sectionTeamManagement'),
                        hidden: !hasAMinimumTeamRoleOf(Roles.Viewer, teamMembership),
                        entries: [
                            {
                                label: t('nav.library'),
                                to: {
                                    name: 'team-library',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'shared-library',
                                icon: BookOpenIcon,
                                disabled: requiresBilling,
                                featureUnavailable: !features.isSharedLibraryFeatureEnabledForPlatform || !features.isSharedLibraryFeatureEnabledForTeam
                            },
                            {
                                label: t('nav.members'),
                                to: {
                                    name: 'team-members',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'team-members',
                                icon: UsersIcon,
                                alert: (() => {
                                    const teamAge = new Date().getTime() - new Date(team.createdAt).getTime()
                                    const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000

                                    if (isTrialAccountExpired) {
                                        return null
                                    }

                                    if (team.memberCount === 1 && teamAge < fourteenDaysInMs) {
                                        return {
                                            title: t('nav.addMemberHint')
                                        }
                                    }

                                    return null
                                })()
                            }
                        ]
                    },
                    {
                        title: t('nav.sectionTeamAdmin'),
                        hidden: !hasAMinimumTeamRoleOf(Roles.Viewer, teamMembership),
                        permission: '',
                        entries: [
                            {
                                label: t('nav.auditLog'),
                                to: {
                                    name: 'team-audit-log',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'team-audit',
                                icon: QueueIcon,
                                disabled: requiresBilling,
                                permission: 'team:edit'
                            },
                            {
                                label: t('nav.billing'),
                                to: {
                                    name: 'team-billing',
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
                                    return !!accountFeatures?.billing && hasPermission('team:edit', teamMembership)
                                })()
                            },
                            {
                                label: t('nav.teamSettings'),
                                to: {
                                    name: 'team-settings',
                                    params: { team_slug: team.slug }
                                },
                                tag: 'team-settings',
                                icon: Cog8ToothIcon,
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
        mainNavContext (state) {
            const contextStore = useContextStore()
            const team = contextStore.team
            const teamMembership = contextStore.teamMembership

            if (!team && !['admin', 'user'].includes(state.mainNav.context)) {
                // todo this compensates for a brief moment after logging in where we don't have a team loaded and can't properly
                //  generate menu links. This should be addressed by implementing an application service that bootstrap's the
                //  app and hydrates vuex stores before attempting to render any data
                return []
            }

            return this.mainNavContexts[state.mainNav.context]
                .map(category => {
                    // filter hidden entries
                    category.entries = category.entries.filter(entry => (!!entry && entry?.hidden) ?? true)

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
    },
    actions: {
        setMainNavContext (context) { this.mainNav.context = context },
        setMainNavBackButton (button) { this.mainNav.backToButton = button }
    }
})
