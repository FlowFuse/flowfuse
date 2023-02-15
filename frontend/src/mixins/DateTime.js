const format = (dateString, locale = null, style = {}) => {
    const date = new Date(dateString)
    if (!locale) {
        locale = 'en-US'
    }
    // Then specify how you want your dates to be formatted
    const datetime = new Intl.DateTimeFormat(locale, style)
    try {
        return datetime.format(date)
    } catch (err) {
        return dateString
    }
}

export default {
    methods: {
        formatDateTime: (dateString, locale = null, style = {}) => format(dateString, locale, { ...{ timeStyle: 'short', dateStyle: 'long' }, ...style }),
        formatDate: (dateString, locale = null, style = {}) => format(dateString, locale, { ...{ dateStyle: 'long' }, ...style }),
        formatTime: (dateString, locale = null, style = {}) => format(dateString, locale, { ...{ timeStyle: 'short' }, ...style })
    }
}
