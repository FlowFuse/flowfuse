export default {
    methods: {
        // value should be in "cents"
        formatCurrency (value) {
            if (typeof value !== 'number') {
                return value
            }
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            })
            return formatter.format(value / 100)
        }
    }
}
