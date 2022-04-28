<template>
    <table class="props-table">
        <tbody>
            <tr>
                <th>Event</th>
                <th>Example</th>
                <th>Description</th>
            </tr>
            <tr v-for="r in rows" :key="r.key">
                <th><pre>{{ r.event }}</pre></th>
                <td><pre>{{ r.example || 'no example' }}</pre></td>
                <td>{{ r.description }}</td>
            </tr>
        </tbody>
    </table>
</template>

<script>
export default {
    name: 'EventsTable',
    props: {
        rows: Array
    }
}
</script>
