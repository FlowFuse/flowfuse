<template>
    <div class="ff-main-navigation">
        <ul class="ff-menu-groups">
            <li v-for="(group, $groupKey) in mainNavContext" :key="$groupKey" class="ff-menu-group">
                <h6 v-if="group.title" class="ff-group-title">{{ group.title }}</h6>

                <ul class="ff-menu-entries">
                    <li v-for="(entry, $entryId) in group.entries" :key="$entryId" class="ff-menu-entry">
                        <router-link
                            v-if="entry.label"
                            :to="entry.to"
                            :data-nav="entry.tag"
                            :class="{ disabled: entry.disabled }"
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
import { ChevronLeftIcon } from '@heroicons/vue/outline'
import { mapActions, mapGetters, mapState } from 'vuex'

import permissionsMixin from '../../../mixins/Permissions.js'
import NavItem from '../../NavItem.vue'

export default {
    name: 'MainNav',
    components: { NavItem },
    mixins: [permissionsMixin],
    emits: ['option-selected'],
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'features', 'notifications']),
        ...mapState('ux', ['mainNav']),
        ...mapGetters('account', ['noBilling']),
        ...mapGetters('ux', ['mainNavContexts', 'mainNavContext']),
        nearestMetaMenu () {
            if (this.$route?.meta?.menu) {
                return this.$route.meta.menu
            }

            // find the nearest parent with the meta.menu entry
            const parentRoute = this.$route.matched.find(route => route.meta && route.meta.menu)
            return parentRoute ? parentRoute.meta.menu : null
        },
        nearestContextualMenu () {
            switch (true) {
            case this.nearestMetaMenu === null:
                return 'team'

            case typeof this.nearestMetaMenu === 'string':
                return this.nearestMetaMenu

            case typeof this.nearestMetaMenu === 'object':
                return this.nearestMetaMenu.type

            default:
                return 'team'
            }
        },
        backToButton () {
            const defaultBackToRoute = {
                label: 'Back to Dashboard',
                to: { name: 'Applications', params: { team_slug: this.team.slug } },
                tag: 'back',
                icon: ChevronLeftIcon
            }

            if (this.nearestMetaMenu === null) {
                return defaultBackToRoute
            }

            const hasBackToProp = Object.prototype.hasOwnProperty.call(this.nearestMetaMenu, 'backTo')
            const isNearestMenuAnObject = typeof this.nearestMetaMenu === 'object'

            switch (true) {
            case isNearestMenuAnObject && hasBackToProp && typeof this.nearestMetaMenu.backTo === 'object':
                return { ...defaultBackToRoute, ...this.nearestMetaMenu.backTo }

            case isNearestMenuAnObject && hasBackToProp && typeof this.nearestMetaMenu.backTo === 'function':
                return { ...defaultBackToRoute, ...this.nearestMetaMenu.backTo({ team_slug: this.team.slug }) }

            case typeof this.nearestMetaMenu === 'string':
            default:
                return defaultBackToRoute
            }
        },
        shouldDisplayBackButton () {
            return ['admin', 'user', 'back'].includes(this.mainNav.context)
        }
    },
    watch: {
        nearestContextualMenu: {
            handler: function (menu) {
                if (['user', 'admin', 'back', 'team'].includes(menu)) {
                    this.setMainNavContext(menu)
                }
            },
            immediate: true
        },
        backToButton: {
            handler: function (menu) {
                this.setMainNavBackButton(menu)
            },
            immediate: true
        }
    },
    methods: {
        ...mapActions('ux', ['setMainNavContext', 'setMainNavBackButton'])
    }
}
</script>

<style scoped lang="scss">

</style>
