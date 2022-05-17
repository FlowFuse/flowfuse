export default {
    methods: {
        formatDate (dateString) {
            const date = new Date(dateString)
            // Then specify how you want your dates to be formatted
            const datetime = new Intl.DateTimeFormat('default', { dateStyle: 'long' })
            try {
                return datetime.format(date)
            } catch (err) {
                return dateString
            }
        }
    }
}
