export default {
    methods: {
        formatDate (dateString) {
            const date = new Date(dateString * 1000)
            // Then specify how you want your dates to be formatted
            return new Intl.DateTimeFormat('default', { dateStyle: 'long' }).format(date)
        }
    }
}
