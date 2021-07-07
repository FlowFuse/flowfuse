<template>
    <div class="md:w-44 w-14 bg-gray-800 md:h-full flex-shrink-0 flex-col justify-between flex min-h-screen">
        <div>
            <div class="mt-1 h-16 w-full text-gray-300 flex items-center">
                <LogoSquare class="inline-flex md:hidden"/>
                <Logo class="hidden md:inline-flex"/>
            </div>
            <ul class="mt-6">
                <template v-for="(item, itemIdx) in navigation" :key="item.name">
                    <li class="flex w-full justify-between items-center mb-2">
                        <router-link :to="item" active-class="bg-blue-900 text-gray-100" class="px-4 text-gray-300 hover:text-gray-100 hover:bg-gray-700 w-full p-2 text-sm flex items-center">
                            <component :is="item.icon" class="h-6 w-6"/>
                            <span class="ml-3 hidden md:inline-flex">{{ item.name }}</span>
                        </router-link>
                    </li>
                </template>
            </ul>
        </div>
        <div>
            <div class="flex flex-col md:flex-row text-xs md:text-sm mx-auto p-4 text-white items-center justify-center">
                <span class="font-bold">FLOW</span><span class="font-light">FORGE</span>
            </div>
        </div>
    </div>
</template>

<script>

import { HomeIcon, UserGroupIcon } from '@heroicons/vue/outline'
import router from "@/routes"
import Logo from "@/components/Logo"
import LogoSquare from "@/components/LogoSquare"

const navigation = router.options.routes.filter(r => r.navigationLink)

export default {
    name: "Sidebar",
    data() {
        return {
            moved: true,
        };
    },
    methods: {
        // sidebarHandler() {
        //     var sideBar = document.getElementById("mobile-nav");
        //     sideBar.style.transform = "translateX(-260px)";
        //     if (this.$data.moved) {
        //         sideBar.style.transform = "translateX(0px)";
        //         this.$data.moved = false;
        //     } else {
        //         sideBar.style.transform = "translateX(-260px)";
        //         this.$data.moved = true;
        //     }
        // },
    },
    components: {
         HomeIcon,
         UserGroupIcon,
         Logo,
         LogoSquare
    },
    setup() {
        return {
            navigation
        }
    }
};
</script>
