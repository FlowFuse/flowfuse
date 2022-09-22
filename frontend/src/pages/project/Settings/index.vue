<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :project="project" @projectUpdated="this.$emit('projectUpdated')"></router-view>
        </div>
    </div>
</template>

<script>
import SectionSideMenu from '@/components/SectionSideMenu'
import { mapState } from 'vuex'
import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'ProjectSettings',
    props: ['project'],
    mixins: [permissionsMixin],
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
                this.sideNavigation.push({ name: 'Editor', path: './editor' })
                this.sideNavigation.push({ name: 'Palette', path: './palette' })
                this.sideNavigation.push({ name: 'Danger', path: './danger' })
            }
        }
    }
}
</script>
