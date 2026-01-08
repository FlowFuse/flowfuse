<template>
    <SectionTopMenu hero="Application Settings" />
    <div class="flex flex-col sm:flex-row mt-9 ml-6" data-el="application-settings">
        <SectionSideMenu :options="sideNavigation" />
        <router-view v-slot="{ Component }">
            <component
                :is="Component"
                :application="application"
                @application-updated="$emit('application-updated')"
                @application-delete="$emit('application-delete')"
            />
        </router-view>
    </div>
</template>

<script>

import { mapGetters } from 'vuex'

import SectionSideMenu from '../../../components/SectionSideMenu.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import usePermissions from '../../../composables/Permissions.js'

export default {
    name: 'ApplicationSettings',
    components: {
        SectionTopMenu,
        SectionSideMenu
    },
    inheritAttrs: false,
    props: {
        application: {
            type: Object,
            required: true
        }
    },
    emits: ['application-delete', 'application-updated'],
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck', 'isAdminUser']),
        sideNavigation () {
            return [
                {
                    name: 'General',
                    key: 'general',
                    path: {
                        name: 'application-settings-general',
                        props: {
                            applicationId: this.application.id
                        }
                    }
                },
                {
                    name: 'User Access',
                    key: 'user-access',
                    path: {
                        name: 'application-settings-user-access'
                    },
                    hidden: (!this.hasPermission('application:access-control', { application: this.application }) && !this.isAdminUser) ||
                        !this.featuresCheck.isRBACApplicationFeatureEnabled
                }
            ]
        }
    }
}
</script>
