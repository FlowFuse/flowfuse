<template>
    <Disclosure as="nav" class="bg-white" v-slot="{ open }">
      <div class="m-w-screen mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
            <div class="flex flex-grow items-center bg-white p-2  text-gray-500">
              <router-link to="/" class="px-2 py-2 bg-gray-100 text-gray-400 hover:text-gray-600 focus:text-gray-800 rounded-lg flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-600 focus:ring-gray-400"><HomeIcon class="h-5 w-5" aria-hidden="true" /></router-link>
              <ChevronRightIcon v-if="breadcrumbs.length > 0" class="h-5 w-5 mx-2 text-blue-400" aria-hidden="true" />
              <template v-for="(item, itemIdx) in breadcrumbs" :key="item.name">
                  <ChevronRightIcon v-if="itemIdx > 0" class="h-5 w-5 mx-2 text-blue-400" aria-hidden="true" />
                  <router-link :to="item.to || {}">{{ item.label }}</router-link>
              </template>
            </div>
            <a v-if="$route.name != 'CreateProject'" href="/create" class="pl-2 pr-3 py-1 bg-blue-900 hover:bg-indigo-700 text-white hover:text-gray-200 focus:text-gray-300 rounded-lg flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-600 focus:ring-gray-400">
                <PlusSmIcon class="w-6" /><span>Create Project</span>
            </a>
          <!-- User Button -->
          <div class="hidden md:block flex-none">
            <div class="ml-4 flex items-center md:ml-6">
              <Menu as="div" class="ml-3 relative">
                <div>
                  <MenuButton class="pl-2 pr-1 py-1 bg-gray-100 text-gray-400 hover:text-gray-600 focus:text-gray-800 rounded-lg flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-600 focus:ring-gray-400">
                    <div class="mr-3">{{user.name}}</div>
                    <span class="sr-only">Open user menu</span>
                    <img :src="user.avatar" class="h-6 v-6 rounded-md"/>
                  </MenuButton>
                </div>
                <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
                  <MenuItems class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <MenuItem v-for="item in profile" :key="item.name" v-slot="{ active }">
                      <router-link :to="item" :class="[active ? 'bg-gray-100' : '', 'block px-4 py-2 text-sm text-gray-700']">{{ item.name }}</router-link>
                    </MenuItem>
                  </MenuItems>
                </transition>
              </Menu>
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

import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { MenuIcon, XIcon, HomeIcon, ChevronRightIcon, PlusSmIcon } from '@heroicons/vue/outline'

const navigation = router.options.routes.filter(r => r.navigationLink)
export default {
  name: "Navbar",
  computed: {
      profile: function() {
          return router.options.routes.filter(r => {
              return r.profileLink && (!r.adminOnly || this.user.admin)
          })
      },
      ...mapState('account',['user']),
      ...mapState('breadcrumbs',['breadcrumbs']),

  },
  // watch: {
  //     breadcrumbs: 'refreshBreadcrumbs'
  // },
  // mounted() {
  //     this.refreshBreadcrumbs();
  // },
  // methods: {
  //     refreshBreadcrumbs() {
  //         // const parts = this.$router.currentRoute.value.path.split("/").filter( v => !!v).map(v => {
  //         //     return {
  //         //         name: v
  //         //     }
  //         // })
  //
  //         // this.breadcrumbs = parts
  //         console.log(this.breadcrumbs);
  //     }
  // },
  components: {
      Logo,
      Disclosure,
      DisclosureButton,
      DisclosurePanel,
      Menu,
      MenuButton,
      MenuItem,
      MenuItems,
      MenuIcon,
      XIcon,
      HomeIcon,
      ChevronRightIcon,
      PlusSmIcon
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
