<template>
    <div class="forge-block">
        <SectionTopMenu :options="navigation"></SectionTopMenu>
        <div class="text-sm px-4 sm:px-6 lg:px-8 mt-8">
            <router-view></router-view>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Breadcrumbs from '@/mixins/Breadcrumbs';
import SectionTopMenu from '@/components/SectionTopMenu';

const navigation = [
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
