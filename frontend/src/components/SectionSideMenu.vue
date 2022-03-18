<template>
    <ul class="mb-6 sm:mb-0 sm:-ml-6 w-full pb-4 sm:pb-0 sm:w-32 border-b sm:border-b-0 sm:border-r overflow-hidden border-gray-400 mr-6 text-gray-500 space-y-2">
        <template v-for="item in options" :key="item.name">
            <li class="block">
                <router-link :to="item.path" class="block text-sm px-3 py-1 sm:py-2 pl-3 ml-1" exact-active-class="text-blue-700 ml-0 border-l-4 border-blue-700">{{ item.name }}</router-link>
            </li>
        </template>
    </ul>
</template>
<script>

export default {
    name: 'SectionSideMenu',
    props: ['options']
}

</script>
