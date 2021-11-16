<template>
    <div class="forge-block">
        <div class="flex items-center mb-8">
            <div class="mr-3"><img :src="user.avatar" class="h-14 v-14 rounded-md"/></div>
            <div class="flex flex-col">
                <div class="text-xl font-bold">{{ user.name }}</div>
                <div class="text-l text-gray-400">{{ user.username }}</div>
            </div>
        </div>
        <SectionTopMenu :options="navigation" />
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
    { name: "Settings", path: "/account/settings" },
    { name: "Teams", path: "/account/teams" },
    { name: "Security", path: "/account/security" }
]

export default {
    name: 'User',
    mixins: [ Breadcrumbs ],
    computed: {
        ...mapState('account',['user'])
    },
    created() {
        this.setBreadcrumbs([
            {label:"User Settings", to:{name:"User Settings"}}
        ]);
    },
    components: {
        SectionTopMenu
    },
    setup() {
        return {
            navigation
        }
    },
    components: {
        SectionTopMenu
    }
}
</script>
