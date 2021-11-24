<template>
    <ul class="flex flex-wrap border-b border-gray-700 mb-4 sm:mb-10 text-gray-500">
        <template v-if="hasHero">
            <li class="w-full md:w-auto mb-2 mr-8">
                <slot name="hero"></slot>
            </li>
        </template>
        <template v-for="(item, itemIdx) in options" :key="item.name">
            <li class="mr-8 pt-1 flex">
                <router-link :to="item.path" class="forge-nav-item" active-class="forge-nav-item-active">{{ item.name }}</router-link>
            </li>
        </template>
        <template v-if="hasTools">
            <li class="w-full md:w-auto flex-grow mb-2 text-right">
                <slot name="tools"></slot>
            </li>
        </template>
    </ul>
</template>
<script>
import {ref} from "vue";

export default {
    name: "SectionTopMenu",
    props: ['options'],
    setup(props, {slots}) {
        const hasHero = ref(false)
        const hasTools = ref(false)
        if (slots.hero && slots.hero().length) {
            hasHero.value = true
        }
        if (slots.tools && slots.tools().length) {
            hasTools.value = true
        }
        return {
            hasHero,
            hasTools
        }
    }
};

</script>
