module.exports = {
    isFQDN (string) {
        // Maximum of 253 characters
        // Made up of alphanumeric+hyphen segments up 1-63 characters long that does not start/end in hyphens
        // Ends in a TLD of 2-63 alphanumeric characters
        // Optional trailing .
        const regex = /(?=^.{4,253}\.?$)(^((?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}\.?$)/

        return regex.test(string)
    }
}
