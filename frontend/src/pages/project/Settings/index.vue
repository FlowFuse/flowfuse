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
import { useRouter } from 'vue-router'
import { mapState } from 'vuex'
import { Roles } from '@core/lib/roles'

export default {
    name: 'ProjectSettings',
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
            if (this.teamMembership && this.teamMembership.role >= Roles.Owner) {
                this.sideNavigation.push({ name: 'Editor', path: './editor' })
                this.sideNavigation.push({ name: 'Palette', path: './palette' })
                this.sideNavigation.push({ name: 'Danger', path: './danger' })
            }
        }
    }
}
</script>
