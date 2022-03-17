<template>
    <Disclosure as="nav" class="bg-white" v-slot="{ open }">
        <div class="m-w-screen mx-auto px-4 sm:px-6 lg:px-8 bg-white">
            <div class="flex items-center justify-between h-16">
                <div class="hidden md:flex flex-grow items-center text-gray-500">
                    <router-link to="/" class="forge-button-inline px-2 flex items-center mr-2">
                        <HomeIcon class="h-5 w-5 my-1" aria-hidden="true" />
                    </router-link>
                    <NavBreadcrumbs />
                </div>

                <div class="hidden md:block flex-none">
                    <div class="flex items-center">
                        <!-- User Button -->
                        <DropdownMenu buttonClass="forge-button-tertiary" alt="Open user menu" :options="profile">
                            <div class="mr-3">{{user.name}}</div>
                            <img :src="user.avatar" class="h-6 v-6 rounded-md"/>
                        </DropdownMenu>
                    </div>
                </div>

                <!-- Mobile menu button -->
                <div class="-mr-2 flex md:hidden">
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
                <template v-for="item in profile" :key="item.name">
                    <template v-if="item.external">
                        <a :href="item.link" target="_blank" :class="[active ? 'bg-gray-200' : '', item.selected? 'bg-gray-100':'', 'block px-4 py-2 text-sm text-gray-700',...(item.class||[])]">
                            <component v-if="item.icon" class="w-4 inline" :is="item.icon"></component>
                            <img v-if="item.imgUrl" :src="item.imgUrl" class="h-4 v-4 inline rounded mr-1"/>
                            <img v-if="item.imgUrl" :src="item.imgUrl" class="h-4 v-4 inline rounded mr-1"/>
                            {{ item.name }}
                        </a>
                    </template>
                    <template v-else-if="item.link || item.path">
                        <router-link :to="item.link || item" :class="[active ? 'bg-gray-200' : '', item.selected? 'bg-gray-100':'', 'block px-4 py-2 text-sm text-gray-700',...(item.class||[])]">
                            <component v-if="item.icon" class="w-4 inline" :is="item.icon"></component>
                            <img v-if="item.imgUrl" :src="item.imgUrl" class="h-4 v-4 inline rounded mr-1"/>
                            {{ item.name }}
                        </router-link>
                    </template>
                </template>
            </div>
        </DisclosurePanel>
    </Disclosure>
</template>
<script>
import { ref } from 'vue'
import { mapState } from 'vuex'
import router from '@/routes'
import FlowForgeLogo from '@/components/Logo'
import DropdownMenu from '@/components/DropdownMenu'
import NavBreadcrumbs from '@/components/Breadcrumbs'

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { MenuIcon, XIcon, HomeIcon, ChevronRightIcon } from '@heroicons/vue/outline'

const navigation = router.options.routes.filter(r => r.navigationLink)
export default {
    name: 'Navbar',
    computed: {
        profile: function () {
            const profileLinks = router.options.routes.filter(r => {
                return r.profileLink && (!r.adminOnly || this.user.admin)
            })
            profileLinks.sort((A, B) => {
                return (A.profileMenuIndex || 0) - (B.profileMenuIndex || 0)
            })
            return profileLinks
        },
        ...mapState('account', ['user', 'team', 'teams'])
    },
    components: {
        FlowForgeLogo,
        DropdownMenu,
        Disclosure,
        DisclosureButton,
        DisclosurePanel,
        MenuIcon,
        XIcon,
        HomeIcon,
        ChevronRightIcon,
        NavBreadcrumbs
    },
    setup () {
        const open = ref(false)
        return {
            open,
            navigation
        }
    }
}

</script>
