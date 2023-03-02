<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :project="project" @projectUpdated="$emit('projectUpdated')" />
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import SectionSideMenu from '@/components/SectionSideMenu'
import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'ProjectSettings',
    mixins: [permissionsMixin],
    props: ['project'],
    computed: {
        ...mapState('account', ['team', 'teamMembership'])
    },
    data () {
        return {
            sideNavigation: []
        }
    },
    components: {
        SectionSideMenu
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
                this.sideNavigation.push({ name: 'DevOps', path: './devops' })
                this.sideNavigation.push({ name: 'Editor', path: './editor' })
                this.sideNavigation.push({ name: 'Security', path: './security' })
                this.sideNavigation.push({ name: 'Palette', path: './palette' })
            }
        }
    }
}
</script>
