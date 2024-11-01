<template>
    <div class="ff-main-navigation">
        <ul class="ff-menu-groups">
            <li v-for="(group, $groupKey) in filteredNavigation" :key="$groupKey" class="ff-menu-group">
                <h6 v-if="group.title" class="ff-group-title">{{ group.title }}</h6>

                <ul class="ff-menu-entries">
                    <li v-for="(entry, $entryId) in group.entries" :key="$entryId" class="ff-menu-entry">
                        <router-link
                            v-if="entry.label"
                            :to="entry.to"
                            :data-nav="entry.tag"
                            @click="$emit('option-selected')"
                        >
                            <nav-item
                                :label="entry.label"
                                :icon="entry.icon"
                                :featureUnavailable="entry.featureUnavailable"
                            />
                        </router-link>
                    </li>
                </ul>
            </li>
        </ul>
    </div>
</template>

<script>
import {
    BookOpenIcon,
    ChevronLeftIcon,
    ChipIcon,
    CogIcon,
    CollectionIcon,
    ColorSwatchIcon,
    CurrencyDollarIcon,
    DatabaseIcon,
    DesktopComputerIcon,
    LockClosedIcon,
    RssIcon,
    TemplateIcon,
    UserGroupIcon,
    UsersIcon
} from '@heroicons/vue/outline'
import { mapActions, mapGetters, mapState } from 'vuex'

import featuresMixin from '../../../mixins/Features.js'
import permissionsMixin from '../../../mixins/Permissions.js'
import { Roles } from '../../../utils/roles.js'
import NavItem from '../../NavItem.vue'
import ProjectsIcon from '../../icons/Projects.js'

export default {
    name: 'MainNav',
    components: { NavItem },
    mixins: [permissionsMixin, featuresMixin],
    emits: ['option-selected'],
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'features', 'notifications']),
        ...mapState('ux', ['mainNav']),
        ...mapGetters('account', ['noBilling']),
        contextualNavigation () {
            const backToDashboard = {
                entries: [
                    {
                        label: 'Back to Dashboard',
                        to: { name: 'Applications', params: { team_slug: this.team.slug } },
                        tag: 'back',
                        icon: ChevronLeftIcon
                    }
                ]
            }
            return {
                team: [
                    {
                        title: '',
                        entries: [
                            {
                                label: 'Applications',
                                to: { name: 'Applications', params: { team_slug: this.team.slug } },
                                tag: 'team-applications',
                                icon: TemplateIcon,
                                disabled: this.noBilling
                            }
                        ]
                    },
                    {
                        title: 'Instances',
                        entries: [
                            {
                                label: 'Hosted Instances',
                                to: { name: 'Instances', params: { team_slug: this.team.slug } },
                                tag: 'team-instances',
                                icon: ProjectsIcon,
                                disabled: this.noBilling
                            },
                            {
                                label: 'Edge Devices',
                                to: { name: 'TeamDevices', params: { team_slug: this.team.slug } },
                                tag: 'team-devices',
                                icon: ChipIcon,
                                disabled: this.noBilling
                            }
                        ]
                    },
                    {
                        title: 'Operations',
                        entries: [
                            {
                                label: 'Broker',
                                to: { name: 'TeamBroker', params: { team_slug: this.team.slug } },
                                tag: 'team-broker',
                                icon: RssIcon,
                                disabled: this.noBilling,
                                featureUnavailable: !this.isMqttBrokerFeatureEnabled,
                                hidden: this.hasALowerOrEqualTeamRoleThan(Roles.Member) && this.isMqttBrokerFeatureEnabledForPlatform
                            }
                        ]
                    },
                    {
                        title: 'Team Management',
                        entries: [
                            {
                                label: 'Library',
                                to: { name: 'TeamLibrary', params: { team_slug: this.team.slug } },
                                tag: 'shared-library',
                                icon: BookOpenIcon,
                                disabled: this.noBilling,
                                featureUnavailable: !this.features?.['shared-library'] || this.team?.type.properties.features?.['shared-library'] === false
                            },
                            {
                                label: 'Members',
                                to: { name: 'TeamMembers', params: { team_slug: this.team.slug } },
                                tag: 'team-members',
                                icon: UsersIcon,
                                disabled: this.noBilling
                            }
                        ]
                    },
                    {
                        title: 'Team Admin',
                        permission: '',
                        entries: [
                            {
                                label: 'Audit Log',
                                to: { name: 'AuditLog', params: { team_slug: this.team.slug } },
                                tag: 'team-audit',
                                icon: DatabaseIcon,
                                disabled: this.noBilling,
                                permission: 'team:edit'
                            },
                            {
                                label: 'Billing',
                                to: { name: 'Billing', params: { team_slug: this.team.slug } },
                                tag: 'team-billing',
                                icon: CurrencyDollarIcon,
                                hidden: (() => {
                                    // hide menu entry for non-billing setups
                                    if (this.noBilling) {
                                        return true
                                    }

                                    // team members that are part of teams that have suspended/no billing setup are forcibly redirected
                                    // to the billing page (even if they don't have permissions to normally access the billing page)
                                    return !!this.features?.billing && this.hasPermission('team:edit')
                                })()
                            },
                            {
                                label: 'Team Settings',
                                to: { name: 'TeamSettings', params: { team_slug: this.team.slug } },
                                tag: 'team-settings',
                                icon: CogIcon,
                                permission: 'team:edit'
                            }
                        ]
                    }
                ],
                admin: [
                    backToDashboard,
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
                                featureUnavailable: !this.features.flowBlueprints
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
                    backToDashboard,
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
                    backToDashboard
                ]
            }
        },
        navigation () {
            if (!this.team) {
                // compensating for a brief moment after login when the team is not loaded and the menu routes can't be rendered
                // due to lacking team (this team.slug).
                // this has to be addressed in an application service which selectively boots up parts of the application
                // after the appropriate data store have been hydrated
                return []
            }

            let contextualMenu
            if (!Object.prototype.hasOwnProperty.call(this.contextualNavigation, this.mainNav.context)) {
                contextualMenu = this.contextualNavigation.team
            } else contextualMenu = this.contextualNavigation[this.mainNav.context]

            return contextualMenu
        },
        filteredNavigation () {
            return this.navigation
                .map(category => {
                    // filter hidden entries
                    category.entries = category.entries.filter(entry => entry.hidden ?? true)

                    // filter entries without permission
                    category.entries = category.entries.filter(entry => {
                        const hasPermissionKey = Object.prototype.hasOwnProperty.call(entry, 'permission')
                        if (hasPermissionKey && entry.permission.length > 0) {
                            return this.hasPermission(entry.permission)
                        } return true
                    })

                    return category
                })
                .filter(category => { // filter categories without permission
                    const hasPermissionKey = Object.prototype.hasOwnProperty.call(category, 'permission')
                    if (hasPermissionKey && category.permission.length > 0) {
                        return this.hasPermission(category.permission)
                    } return true
                })
                .filter(category => category.entries.length > 0) // filter categories without entries
        }
    }
}
</script>

<style scoped lang="scss">

</style>
