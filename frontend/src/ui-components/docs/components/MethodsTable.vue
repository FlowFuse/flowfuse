<template>
    <table class="docs-table props-table">
        <tbody>
            <tr>
                <th>Method</th>
                <th>Description</th>
                <th>Try</th>
            </tr>
            <tr v-for="r in rows" :key="r.key">
                <th><pre>{{ r.name }}</pre></th>
                <td>{{ r.description }}</td>
                <td><ff-button @click="callMethod(r.name)">{{r.name}}</ff-button></td>
            </tr>
        </tbody>
    </table>
</template>

<script>
export default {
    name: 'MethodsTable',
    props: {
        rows: Array
    },
    methods: {
        callMethod (name) {
            this.$emit('callMethod', name)
        }
    }
}
</script>
