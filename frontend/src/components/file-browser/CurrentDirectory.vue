<template>
    <ff-data-table
        :rows="items"
        :columns="columns"
    />
</template>

<script>

export default {
    name: 'CurrentDirectory',
    props: {
        dir: {
            required: true,
            type: Object
        }
    },
    data () {
        return {
            columns: [
                {
                    key: 'name',
                    label: 'Active Directory'
                },
                {
                    key: 'name',
                    label: 'Visibility'
                },
                {
                    key: 'name',
                    label: 'Path'
                }
            ]
        }
    },
    computed: {
        items () {
            return [this.dir]
        }
    }
}
</script>
