<template>
    <table class="docs-table props-table">
        <tbody>
            <tr>
                <th>Slot Name</th>
                <th>Description</th>
            </tr>
            <tr v-for="r in rows" :key="r.name">
                <th><pre>{{ r.name }}</pre></th>
                <td>{{ r.description }}</td>
            </tr>
        </tbody>
    </table>
</template>

<script>
export default {
    name: 'SlotsTable',
    props: {
        rows: Array
    }
}
</script>
