<template>
    <table class="props-table">
        <tbody>
            <tr>
                <th>Property</th>
                <th>Default</th>
                <th>Description</th>
            </tr>
            <tr v-for="r in rows" :key="r.key">
                <th><pre>{{ r.key }}</pre></th>
                <td><pre>{{ r.default || 'no default' }}</pre></td>
                <td>{{ r.description }}</td>
            </tr>
        </tbody>
    </table>
</template>

<script>
export default {
    name: 'PropsTable',
    props: {
        rows: Array
    }
}
</script>
