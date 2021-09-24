<template>
    <div class="forge-block" v-if="team">
        <div>
            <div class="flex items-center mb-8">
                <div class="mr-3"><img :src="team.avatar" class="h-14 v-14 rounded-md"/></div>
                <div class="flex flex-col">
                    <div class="text-xl font-bold">{{ team.name }}</div>
                </div>
            </div>
            <ul class="flex border-b border-gray-700 -mt-2 mb-10 text-gray-500">
                <template v-for="(item, itemIdx) in navigation" :key="item.name">
                    <li class="mr-8 flex">
                        <router-link :to="item.path" class="text-sm sm:pb-3 pb-1" active-class="text-blue-700 border-b-4 border-blue-700">{{ item.name }}</router-link>
                    </li>
                </template>
            </ul>
        </div>

        <div class="text-sm px-4 sm:px-6 lg:px-8 mt-8">
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
                    { type: "TeamPicker" },
                    { type: "CreateProject" }
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
