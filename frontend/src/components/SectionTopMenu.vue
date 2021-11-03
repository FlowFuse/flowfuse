<template>
    <ul class="flex border-b border-gray-700 mb-10 text-gray-500">
        <template v-if="hasHero">
            <li class="w-full md:w-auto mb-2 mr-8">
                <slot name="hero"></slot>
            </li>
        </template>
        <template v-for="(item, itemIdx) in options" :key="item.name">
            <li class="mr-8 flex">
                <router-link :to="item.path" class="forge-nav-item" active-class="forge-nav-item-active">{{ item.name }}</router-link>
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
        if (slots.hero && slots.hero().length) {
            hasHero.value = true
        }
        return {
            hasHero
        }
    }
};

</script>
