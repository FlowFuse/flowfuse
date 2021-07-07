<template>

    <div class="flex items-center mb-8">
        <div class="mr-3"><img :src="user.avatar" class="h-14 v-14 rounded-md"/></div>
        <div class="flex flex-col">
            <div class="text-xl font-bold">{{ user.name }}</div>
        </div>
    </div>
    <ul class="flex border-b border-gray-700 mb-10 text-gray-500">
        <template v-for="(item, itemIdx) in navigation" :key="item.name">
            <li class="mr-8 flex">
                <router-link :to="item.path" class="text-sm sm:pb-3 pb-1" active-class="text-blue-700 border-b-4 border-blue-700">{{ item.name }}</router-link>
            </li>
        </template>
    </ul>
    <div class="text-sm">
        <router-view></router-view>
    </div>
</template>

<script>
import { mapState } from 'vuex'

const navigation = [
    { name: "Settings", path: "/account/settings" },
    { name: "Security", path: "/account/security" }
]

export default {
    name: 'User',
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
