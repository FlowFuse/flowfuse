<template>
    <div>
        <div v-for="(value, key) in settings.stacks.properties" :key="key">
            <div class="font-medium">{{value.label}}</div>
            <div class="pl-2">{{properties[key]}}</div>
        </div>
    </div>
</template>
<script>

import { mapState } from 'vuex'

export default {
    name: 'StackPropertiesCell',
    computed: {
        ...mapState('account', ['settings'])
    },
    props: ['properties']
}
</script>
