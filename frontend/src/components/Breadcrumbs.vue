<template>
    <template v-if="breadcrumbs.length > 0">
        <ChevronRightIcon class="h-5 w-5 mx-2 text-blue-400" aria-hidden="true"></ChevronRightIcon>
        <template v-for="(item, itemIdx) in breadcrumbs" :key="item.name">
            <ChevronRightIcon v-if="itemIdx > 0" class="h-5 w-5 mx-2 text-blue-400" aria-hidden="true"></ChevronRightIcon>
            <template v-if="item.type === 'TeamPicker'">
                <DropdownMenu buttonClass="forge-button-inline" alt="Open team menu" :options="teamOptions" edge="left">
                    <img :src="team && team.avatar" class="h-6 v-6 rounded-md"/>
                    <div class="ml-2">{{team && team.name}}</div>
                </DropdownMenu>
            </template>
            <template v-else-if="item.type === 'CreateProject'">
                <router-link class="forge-button-inline" :to="team?'/team/'+team.slug+'/projects/create':'/create'">
                    <PlusSmIcon class="w-5 h-5 my-1 -ml-1 mr-1" /><span>Create Project</span>
                </router-link>
            </template>
            <template v-else>
                <router-link class="text-sm" :to="item.to || {}">{{ item.label }}</router-link>
        </template>
        </template>
    </template>
</template>
<script>

import { mapState } from 'vuex'
import router from "@/routes"
import DropdownMenu from "@/components/DropdownMenu"
import { HomeIcon, ChevronRightIcon, PlusSmIcon } from '@heroicons/vue/outline'

export default {
  name: "Breadcrumbs",
  computed: {
      ...mapState('breadcrumbs',['breadcrumbs']),
      ...mapState('account',['team','teams']),
      teamOptions: function() {
          return [...this.teams.map(team => {
              return {
                  name: team.name,
                  action: () => { this.selectTeam(team.slug) },
                  selected: this.team && (this.team.slug === team.slug)
              }
          }),null,{
              name:"Create a new team...",
              link: { name: "CreateTeam"}
          }]
      }
  },
  methods: {
      async selectTeam(teamSlug) {
          this.$store.dispatch('account/setTeam',teamSlug);
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
