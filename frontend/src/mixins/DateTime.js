export default {
    methods: {
        formatDate (dateString, locale) {
            const date = new Date(dateString)
            if (!locale) {
                locale = 'en-US'
            }
            // Then specify how you want your dates to be formatted
            const datetime = new Intl.DateTimeFormat(locale, { dateStyle: 'long' })
            try {
                return datetime.format(date)
            } catch (err) {
                return dateString
            }
        }
    }
}
