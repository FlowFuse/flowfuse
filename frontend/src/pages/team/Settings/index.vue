<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :team="team" :teamMembership="teamMembership"></router-view>
        </div>
    </div>
</template>

<script>
import SectionSideMenu from '@/components/SectionSideMenu'
import { useRoute, useRouter } from 'vue-router'
import { Roles } from '@core/lib/roles'

const sideNavigation = [
    { name: 'General', path: './general' },
    // TODO: Make this EE only
    { name: 'Billing', path: './billing' },
    // { name: "Permissions", path: "./permissions" },
    { name: 'Danger', path: './danger' }
]

export default {
    name: 'TeamSettings',
    props: ['team', 'teamMembership'],
    components: {
        SectionSideMenu
    },
    setup () {
        return {
            sideNavigation
        }
    },
    watch: {
        teamMembership: 'checkAccess'
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function () {
            if (this.teamMembership && this.teamMembership.role !== Roles.Owner) {
                useRouter().push({ path: `/team/${this.team.slug}/overview` })
            }
        }
    }
}
</script>
