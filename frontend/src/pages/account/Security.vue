<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view></router-view>
        </div>
    </div>
</template>

<script>
import SectionSideMenu from '@/components/SectionSideMenu'
const sideNavigation = [
    { name: 'Password', path: '/account/security/password' }
    // { name: "Sessions", path: "/account/security/sessions" }
]

export default {
    name: 'AccountSecurity',
    components: {
        SectionSideMenu
    },
    setup () {
        return {
            sideNavigation
        }
    }
}
</script>
