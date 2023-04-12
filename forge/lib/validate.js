const { Sequelize } = require('sequelize')

module.exports = {
    /**
     * Validate a FQDN
     * @param {String} domain Domain string to validate
     * @returns {boolean} `true` if the string is a valid FQDN
     */
    isFQDN (domain) {
        // Maximum of 253 characters
        // Made up of alphanumeric+hyphen segments up 1-63 characters long that does not start/end in hyphens
        // Ends in a TLD of 2-63 alphanumeric characters
        // Optional trailing .
        const regex = /(?=^.{4,253}\.?$)(^((?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}\.?$)/

        return regex.test(domain)
    },
    /**
     * Validate an email address
     * @param {String} emailAddress Email address to validate
     * @returns {boolean} `true` if the email address is valid
     */
    isEmail (emailAddress) {
        // use the same email validator as Sequelize
        return !!emailAddress && typeof emailAddress === 'string' && Sequelize.Validator.isEmail(emailAddress)
    }
}
