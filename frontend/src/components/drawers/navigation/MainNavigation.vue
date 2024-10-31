<template>
    <div class="ff-main-navigation">
        <ul class="ff-menu-groups">
            <li v-for="(group, $groupKey) in filteredNavigation" :key="$groupKey" class="ff-menu-group">
                <h6 v-if="group.title" class="ff-group-title">{{ group.title }}</h6>

                <ul class="ff-menu-entries">
                    <li v-for="(entry, $entryId) in group.entries" :key="$entryId" class="ff-menu-entry">
                        <router-link
                            v-if="entry.label"
                            :class="{'router-link-active': atNestedRoute(entry), 'disabled': entry.disabled}"
                            :to="'/team/' + team.slug + entry.to"
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
import { BookOpenIcon, ChipIcon, CogIcon, CurrencyDollarIcon, DatabaseIcon, RssIcon, TemplateIcon, UsersIcon } from '@heroicons/vue/outline'
import { mapGetters, mapState } from 'vuex'

import featuresMixin from '../../../mixins/Features.js'
import permissionsMixin from '../../../mixins/Permissions.js'
import { Roles } from '../../../utils/roles.js'
import NavItem from '../../NavItem.vue'
import ProjectsIcon from '../../icons/Projects.js'

export default {
    name: 'MainNavigation',
    components: { NavItem },
    mixins: [permissionsMixin, featuresMixin],
    emits: ['option-selected'],
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'features', 'notifications']),
        ...mapGetters('account', ['noBilling']),
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
        },
        navigation () {
            // todo replace to: with named routes
            const main = {
                title: '',
                entries: [
                    {
                        label: 'Applications',
                        to: '/applications',
                        tag: 'team-applications',
                        icon: TemplateIcon,
                        disabled: this.noBilling
                    }
                ]
            }
            const instances = {
                title: 'Instances',
                entries: [
                    {
                        label: 'Hosted Instances',
                        to: '/instances',
                        tag: 'team-instances',
                        icon: ProjectsIcon,
                        disabled: this.noBilling
                    },
                    {
                        label: 'Edge Devices',
                        to: '/devices',
                        tag: 'team-devices',
                        icon: ChipIcon,
                        disabled: this.noBilling
                    }
                ]
            }
            const operations = {
                title: 'Operations',
                entries: [
                    {
                        label: 'Broker',
                        to: '/broker',
                        tag: 'team-broker',
                        icon: RssIcon,
                        disabled: this.noBilling,
                        featureUnavailable: !this.isMqttBrokerFeatureEnabled,
                        hidden: this.hasALowerOrEqualTeamRoleThan(Roles.Member) && this.isMqttBrokerFeatureEnabledForPlatform
                    }
                ]
            }
            const teamManagement = {
                title: 'Team Management',
                entries: [
                    {
                        label: 'Library',
                        to: '/library',
                        tag: 'shared-library',
                        icon: BookOpenIcon,
                        disabled: this.noBilling,
                        featureUnavailable: !this.features?.['shared-library'] || this.team?.type.properties.features?.['shared-library'] === false
                    },
                    {
                        label: 'Members',
                        to: '/members/general',
                        tag: 'team-members',
                        icon: UsersIcon,
                        disabled: this.noBilling
                    }
                ]
            }
            const teamAdmin = {
                title: 'Team Admin',
                permission: '',
                entries: [
                    {
                        label: 'Audit Log',
                        to: '/audit-log',
                        tag: 'team-audit',
                        icon: DatabaseIcon,
                        disabled: this.noBilling,
                        permission: 'team:edit'
                    },
                    {
                        label: 'Billing',
                        to: '/billing',
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
                        to: '/settings',
                        tag: 'team-settings',
                        icon: CogIcon,
                        permission: 'team:edit'
                    }
                ]
            }

            return [
                main,
                instances,
                operations,
                teamManagement,
                teamAdmin
            ]
        }
    },
    methods: {
        // todo check if we actually need it
        atNestedRoute (route) {
            // the high-level route link to "/devices"
            if (route.to === '/devices') {
                // highlight it if we are currently viewing a single device
                if (this.$route.path.indexOf('/device') === 0) {
                    return true
                }
            }
            // the high-level route link to "/projects"
            if (route.to === '/applications') {
                // highlight it if we are currently viewing a single project
                if (this.$route.path.indexOf('/application') === 0) {
                    return true
                }
            }
            // the high-level route link to "/instances"
            if (route.to === '/instances') {
                // highlight it if we are currently viewing a single instance
                if (this.$route.path.indexOf('/instance') === 0) {
                    return true
                }
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
