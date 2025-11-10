export function useDateHelpers () {
    /**
     * @param date {string} date string
     */
    const humanReadableDate = (date) => {
        return new Date(date).toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        })
    }

    return {
        humanReadableDate
    }
}
