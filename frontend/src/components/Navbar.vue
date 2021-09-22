<template>
    <Disclosure as="nav" class="bg-white" v-slot="{ open }">
      <div class="m-w-screen mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
            <div class="hidden md:flex flex-grow items-center bg-white p-2  text-gray-500">
              <router-link to="/" class="forge-button-secondary px-2"><HomeIcon class="h-5 w-5 my-1" aria-hidden="true" /></router-link>
              <ChevronRightIcon v-if="breadcrumbs.length > 0" class="h-5 w-5 mx-2 text-blue-400" aria-hidden="true" />
              <template v-for="(item, itemIdx) in breadcrumbs" :key="item.name">
                  <ChevronRightIcon v-if="itemIdx > 0" class="h-5 w-5 mx-2 text-blue-400" aria-hidden="true" />
                  <router-link :to="item.to || {}">{{ item.label }}</router-link>
              </template>
            </div>
            <CreateProjectButton v-if="$route.name != 'CreateProject'"  :url="createUrl" class="hidden md:flex"/>
          <!-- User Button -->
          <div class="hidden md:block flex-none">
            <div class="ml-4 flex items-center md:ml-6">
            <DropdownMenu class="ml-8" buttonClass="forge-button-secondary" alt="Open user menu" :options="profile">
                <div class="mr-3">{{user.name}}</div>
                <img :src="user.avatar" class="h-6 v-6 rounded-md"/>
            </DropdownMenu>
            </div>
          </div>
          <div class="-mr-2 flex md:hidden">
            <!-- Mobile menu button -->
            <DisclosureButton class="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
              <span class="sr-only">Open main menu</span>
              <MenuIcon v-if="!open" class="block h-6 w-6" aria-hidden="true" />
              <XIcon v-else class="block h-6 w-6" aria-hidden="true" />
            </DisclosureButton>
          </div>

        </div>
      </div>
      <DisclosurePanel class="md:hidden">
          <div class="mt-3 px-2 space-y-1">
              <router-link v-for="item in navigation" :to="item"  :key="item.name" class="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700">{{ item.name }}</router-link>
              <hr>
              <router-link v-for="item in profile" :to="item"  :key="item.name" class="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700">{{ item.name }}</router-link>
          </div>
      </DisclosurePanel>
    </Disclosure>
</template>

<script>
import { ref } from "vue"
import { mapState } from 'vuex'
import router from "@/routes"
import Logo from "@/components/Logo"
import DropdownMenu from "@/components/DropdownMenu"
import CreateProjectButton from "@/components/CreateProjectButton"

import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { MenuIcon, XIcon, HomeIcon, ChevronRightIcon } from '@heroicons/vue/outline'

const navigation = router.options.routes.filter(r => r.navigationLink)
export default {
  name: "Navbar",
  computed: {
      createUrl() {
          if (/^\/team\//.test(this.$router.currentRoute.value.fullPath) && this.$router.currentRoute.value.params.id) {
              return '/team/'+this.$router.currentRoute.value.params.id+'/projects/create'
          }
          return '/create'
      },
      profile: function() {
          return router.options.routes.filter(r => {
              return r.profileLink && (!r.adminOnly || this.user.admin)
          })
      },
      ...mapState('account',['user']),
      ...mapState('breadcrumbs',['breadcrumbs']),

  },
  components: {
      Logo,
      DropdownMenu,
      Disclosure,
      DisclosureButton,
      DisclosurePanel,
      MenuIcon,
      XIcon,
      HomeIcon,
      ChevronRightIcon,
      CreateProjectButton
  },
  setup() {
      const open = ref(false)
      return {
          open,
          navigation
      }
  }
};

</script>
