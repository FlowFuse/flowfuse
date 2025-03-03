<template>
    <div class="ml-4 ff-property">
        <span>{{ name }} ({{ property.type }})</span>
        <template v-if="hasProperties">
            <span>:</span>
            <ObjectProperties :properties="property.properties" class="ml-5" />
        </template>
    </div>
</template>

<script>

import { defineAsyncComponent } from 'vue'

export default {
    name: 'ObjectProperty',
    components: {
        ObjectProperties: defineAsyncComponent(() => import('./ObjectProperties.vue'))
    },
    props: {
        property: {
            required: false,
            type: Object,
            default: null
        },
        name: {
            required: true,
            type: String
        }
    },
    computed: {
        hasProperties () {
            return Object.prototype.hasOwnProperty.call(this.property, 'properties') &&
                Object.keys(this.property.properties).length > 0
        }
    }
}
</script>

<style scoped lang="scss">

</style>
