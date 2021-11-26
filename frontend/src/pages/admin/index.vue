<template>
    <div class="forge-block">
        <SectionTopMenu :options="navigation"></SectionTopMenu>
        <div class="text-sm sm:px-6 mt-4 sm:mt-8">
            <router-view></router-view>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Breadcrumbs from '@/mixins/Breadcrumbs';
import SectionTopMenu from '@/components/SectionTopMenu';

const navigation = [
    { name: "Overview", path: "/admin/overview" },
    { name: "Settings", path: "/admin/settings" },
    { name: "Users", path: "/admin/users" },
    { name: "Teams", path: "/admin/teams" }
]

export default {
    name: 'Admin',
    mixins: [ Breadcrumbs ],
    computed: {
        ...mapState('account',['user'])
    },
    setup() {
        return {
            navigation
        }
    },
    created() {
        this.setBreadcrumbs([
            {label:"Admin", to:{name:"Admin"}}
        ]);
    },
    components: {
        SectionTopMenu
    }
}
</script>
