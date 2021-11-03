<template>
    <ul class="-ml-8 w-32 border-r overflow-hidden border-gray-400 mr-6 text-gray-500 space-y-4">
        <template v-for="(item, itemIdx) in options" :key="item.name">
            <li class="block">
                <router-link :to="item.path" class="block text-sm px-3 py-2 pl-3 ml-1" active-class="text-blue-700 ml-0 border-l-4 border-blue-700">{{ item.name }}</router-link>
            </li>
        </template>
    </ul>
</template>
<script>
import {ref} from "vue";

export default {
    name: "SectionSideMenu",
    props: ['options']
};

</script>
