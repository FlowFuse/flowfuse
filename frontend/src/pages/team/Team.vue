<template>
    <div class="flex items-center mb-8">
        <div class="mr-3"><img :src="team.avatar" class="h-14 v-14 rounded-md"/></div>
        <div class="flex flex-col">
            <div class="text-xl font-bold">{{ team.name }}</div>
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
        <router-view :team="team"></router-view>
    </div>
</template>

<script>
import teamApi from '@/api/team'
import FormHeading from '@/components/FormHeading'

const navigation = [
    { name: "Projects", path: "./projects" },
    { name: "Users", path: "./users" },
]

export default {
    name: 'Team',
    data: function() {
        return {
            team: {},
            navigation: []
        }
    },
    components: {
        FormHeading,
    },
    async created() {
        const parts = this.$route.path.split("/")
        const data = await teamApi.getTeam(parts[2])
        this.team = data;
        this.navigation = [
            { name: "Projects", path: `/team/${parts[2]}/projects` },
            { name: "Users", path: `/team/${parts[2]}/users` },
            { name: "Settings", path: `/team/${parts[2]}/settings` },
        ]
    }
}
</script>
