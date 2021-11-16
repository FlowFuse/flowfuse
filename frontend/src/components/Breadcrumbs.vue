<template>
    <template v-if="breadcrumbs.length > 0">
        <ChevronRightIcon class="h-5 w-5 mx-2 text-blue-400" aria-hidden="true"></ChevronRightIcon>
        <template v-for="(item, itemIdx) in breadcrumbs" :key="item.name">
            <ChevronRightIcon v-if="itemIdx > 0" class="h-5 w-5 mx-2 text-blue-400" aria-hidden="true"></ChevronRightIcon>
            <template v-if="item.type === 'TeamPicker'">
                <DropdownMenu buttonClass="forge-button-inline" alt="Open team menu" :options="teamOptions" edge="left">
                    <template v-if="pendingTeamChange">
                        Loading
                    </template>
                    <template v-else>
                        <img :src="team && team.avatar" class="-my-2 h-6 v-6 rounded-md"/>
                        <div class="ml-2 truncate" style="max-width: 150px">{{team && team.name}}</div>
                    </template>
                </DropdownMenu>
            </template>
            <template v-else-if="item.type === 'TeamLink'">
                <router-link class="forge-button-inline py-2" :to="team?'/team/'+team.slug:''">
                    <img :src="team && team.avatar" class="-my-2 h-6 v-6 rounded-md"/>
                    <div class="ml-2 truncate" style="max-width: 150px">{{team && team.name}}</div>
                </router-link>
            </template>
            <template v-else-if="item.type === 'CreateProject'">
                <router-link class="forge-button" :to="team?'/team/'+team.slug+'/projects/create':'/create'">
                    <PlusSmIcon class="w-5 h-5 my-1 -ml-1 mr-1" /><span>Create Project</span>
                </router-link>
            </template>
            <template v-else-if="item.to">
                <router-link class="forge-button-inline py-2" :to="item.to">{{ item.label }}</router-link>
            </template>
            <template v-else>
                <span class="forge-button-inline-inactive py-2 font-medium">{{ item.label }}</span>
            </template>
        </template>
    </template>
</template>
<script>

import { mapState } from 'vuex'
import router from "@/routes"
import DropdownMenu from "@/components/DropdownMenu"
import { HomeIcon, ChevronRightIcon, PlusSmIcon, CogIcon } from '@heroicons/vue/outline'

export default {
  name: "Breadcrumbs",
  computed: {
      ...mapState('breadcrumbs',['breadcrumbs']),
      ...mapState('account',['team','teams','pendingTeamChange']),
      teamOptions: function() {
          return [
              { icon: CogIcon, name: "Team Settings", link: { path: `/team/${this.team.slug}/settings` }},
              null,

              ...this.teams.map(team => {
              return {
                  name: team.name,
                  imgUrl: team.avatar,
                  action: () => { this.selectTeam(team.slug) },
                  selected: this.team && (this.team.slug === team.slug)
              }
          }),null,{
              name:"Create a new team...",
              icon: PlusSmIcon,
              link: { name: "CreateTeam"}
          }]
      }
  },
  methods: {
      async selectTeam(teamSlug) {
          this.$router.push({name:"Team",params:{id:teamSlug}})
      }
  },
  components: {
      DropdownMenu,
      HomeIcon,
      ChevronRightIcon,
      PlusSmIcon
  }
};

</script>
