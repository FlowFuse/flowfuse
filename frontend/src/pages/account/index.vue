<template>
    <div class="forge-block">
        <div class="flex items-center mb-8">
            <div class="mr-3"><img :src="user.avatar" class="h-14 v-14 rounded-md"/></div>
            <div class="flex flex-col">
                <div class="text-xl font-bold">{{ user.name }}</div>
                <div class="text-l text-gray-400">{{ user.username }}</div>
            </div>
        </div>
        <ul class="flex border-b border-gray-700 mb-10 text-gray-500">
            <template v-for="(item, itemIdx) in navigation" :key="item.name">
                <li class="mr-8 flex">
                    <router-link :to="item.path" class="text-sm sm:pb-3 pb-1" active-class="text-blue-700 border-b-4 border-blue-700">{{ item.name }}</router-link>
                </li>
            </template>
        </ul>
        <div class="text-sm px-4 sm:px-6 lg:px-8 mt-8">
            <router-view></router-view>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Breadcrumbs from '@/mixins/Breadcrumbs';

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
    setup() {
        return {
            navigation
        }
    }
}
</script>
