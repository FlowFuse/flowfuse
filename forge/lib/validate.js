module.exports = {
    isFQDN (string) {
        const regex = /(?=^.{4,253}$)(^((?!-)[a-zA-Z0-9-]{0,62}[a-zA-Z0-9]\.)+[a-zA-Z]{2,63}\.?$)/

        return regex.test(string)
    }
}
