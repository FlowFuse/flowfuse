<template>
    <div class="forge-block">
        <div class="flex items-center mb-8">
            <div class="flex flex-col">
                <div class="text-xl font-bold">Organization</div>
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

const navigation = [
    { name: "Settings", path: "/organization/settings" },
    { name: "Users", path: "/organization/users" },
    { name: "Teams", path: "/organization/teams" }
]

export default {
    name: 'Organization',
    computed: {
        ...mapState('account',['user'])
    },
    setup() {
        return {
            navigation
        }
    }
}
</script>
