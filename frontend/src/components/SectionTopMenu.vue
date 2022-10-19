<template>
    <div class="flex flex-wrap border-b border-gray-700 mb-4 sm:mb-10 text-gray-500 justify-between">
        <div class="flex">
            <div class="w-full md:w-auto mb-2 mr-8">
                <slot name="hero">
                    <div class="flex">
                        <div class="text-gray-800 text-xl font-bold">{{ hero }}</div>
                    </div>
                </slot>
            </div>
            <ul class="flex">
                <li class="mr-8 pt-1 flex" v-for="item in options" :key="item.name">
                    <router-link :to="item.path" class="forge-nav-item" active-class="forge-nav-item-active" :data-nav="`section-${item.name.toLowerCase()}`">{{ item.name }}</router-link>
                </li>
            </ul>
        </div>
        <ul v-if="hasTools">
            <li class="w-full md:w-auto flex-grow mb-2 text-right">
                <slot name="tools"></slot>
            </li>
        </ul>
    </div>
</template>
<script>
import { ref } from 'vue'

export default {
    name: 'SectionTopMenu',
    props: ['hero', 'options'],
    setup (props, { slots }) {
        const hasTools = ref(false)
        if (slots.tools && slots.tools().length) {
            hasTools.value = true
        }
        return {
            hasTools
        }
    }
}

</script>
