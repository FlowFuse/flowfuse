<template>
    <div class="ff-object-properties">
        <span>{</span>
        <ul class="font-mono">
            <li v-for="(property, name) in properties" :key="name">
                <object-property :name="name" :property="property" />
            </li>
        </ul>
        <span>}</span>
    </div>
</template>

<script>

import { defineAsyncComponent } from 'vue'

export default {
    name: 'ObjectProperties',
    components: {
        ObjectProperty: defineAsyncComponent(() => import('./ObjectProperty.vue'))
    },
    props: {
        properties: {
            required: true,
            type: Object
        }
    }
}
</script>

<style scoped lang="scss">

</style>
