<template>
    <div class="forge-block" v-if="team">
        <ul class="flex flex-wrap items-end border-b border-gray-300 mb-5 text-gray-500">
            <li class="w-full md:w-auto mb-2 mr-8">
                <router-link :to="navigation[0]?navigation[0].path:''" class="flex items-center">
                    <div class="mr-3 rounded"><img :src="team.avatar" class="h-6 v-6 rounded-md"/></div>
                    <div class="text-gray-800 text-xl font-bold">{{ team.name }}</div>
                </router-link>
            </li>
            <template v-for="(item, itemIdx) in navigation" :key="item.name">
                <li class="mr-8 flex">
                    <router-link :to="item.path" class="forge-nav-item" active-class="forge-nav-item-active">{{ item.name }}</router-link>
                </li>
            </template>
        </ul>
        <div class="text-sm px-0 mt-4">
            <router-view :team="team"></router-view>
        </div>
    </div>
</template>

<script>
import teamApi from '@/api/team'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs';

import { mapState } from 'vuex'
export default {
    name: 'Team',
    mixins: [Breadcrumbs],
    computed: {
        ...mapState('account',['team']),
    },
    data: function() {
        return {
            navigation: []
        }
    },
    components: {
        FormHeading,
    },
    methods: {
        updateTeam: function(newVal,oldVal) {
            if (this.team) {
                this.navigation = [
                    { name: "Overview", path: `/team/${this.team.slug}/overview` },
                    { name: "Projects", path: `/team/${this.team.slug}/projects` },
                    { name: "Members", path: `/team/${this.team.slug}/members` },
                ];
                // const teamUser = this.team.users.filter(u => { console.log(u,this.$store.state.account.user.email); return  u.email === this.$store.state.account.user.email })

                // if (teamUser.role === "owner") {
                this.navigation.push({ name: "Settings", path: `/team/${this.team.slug}/settings` });
                // }
                this.setBreadcrumbs([
                    { type: "TeamPicker" }
                    // { type: "CreateProject" }
                ])
            }
        }
    },
    mounted() {
        this.updateTeam()
    },
    watch: {
         team: 'updateTeam'
    }
}
</script>
