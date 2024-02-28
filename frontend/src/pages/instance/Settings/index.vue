<template>
    <div class="mb-3">
        <SectionTopMenu hero="Settings" info="" />
    </div>
    <div class="flex flex-col sm:flex-row ml-6">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view
                :project="instance"
                :instance="instance"
                @instance-updated="$emit('instance-updated')"
                @instance-confirm-suspend="$emit('instance-confirm-suspend')"
                @instance-confirm-delete="$emit('instance-confirm-delete')"
            />
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import SectionSideMenu from '../../../components/SectionSideMenu.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import permissionsMixin from '../../../mixins/Permissions.js'

export default {
    name: 'InstanceSettings',
    components: {
        SectionTopMenu,
        SectionSideMenu
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'instance-confirm-delete', 'instance-confirm-suspend'],
    data () {
        return {
            sideNavigation: []
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership', 'features', 'settings'])
    },
    watch: {
        teamMembership: 'checkAccess'
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function () {
            this.sideNavigation = [
                { name: 'General', path: './general' },
                { name: 'Environment', path: './environment' }
            ]
            if (this.hasPermission('project:edit')) {
                if (this.features.ha) {
                    this.sideNavigation.push({ name: 'High Availability', path: './ha' })
                }
                if (this.features.protectedInstance && this.team.type.properties.features?.protectedInstance) {
                    this.sideNavigation.push({ name: 'Protect Instance', path: './protectInstance' })
                }
                this.sideNavigation.push({ name: 'Editor', path: './editor' })
                this.sideNavigation.push({ name: 'Security', path: './security' })
                this.sideNavigation.push({ name: 'Palette', path: './palette' })
                if (this.features.emailAlerts && this.team.type.properties.features?.emailAlerts) {
                    this.sideNavigation.push({ name: 'Alerts', path: './alerts' })
                }
            }
        }
    }
}
</script>
