<template>
    <table class="table-auto">
        <tr v-for="(value, key) in settings.stacks.properties" :key="key">
            <td class="pr-8">{{value.label}}</td>
            <td>{{properties[key]}}</td>
        </tr>
    </table>
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
