/**
 * Augments the TeamType model will billing-specific instance functions
 * @param {*} app
 */
module.exports = function (app) {
    /**
     * Get the Stripe product/price ids for the team type.
     *
     * These are either:
     *  - Provided via flowforge.yml.
     *    - billing.stripe.team_* provide the default values.
     *    - billing.stripe.teams.<type-name>.* provide type-specific values
     *  - Provided by team.TeamType.properties.billing.*
     *
     * Each of these potential sources is checked, the latter taking precedence
     * over the former.
     *
     * Example flowforge.yml config:
     *   billing:
     *     stripe:
     *       ...
     *       team_price: <default team price>
     *       team_product: <default team product>
     *       device_price: <default device price>
     *       device_product: <default device product>
     *       ...
     *       teams:
     *         starter:
     *           price: <starter team price>
     *           product: <starter team product>
     * @returns object
     */
    app.db.models.TeamType.prototype.getTeamBillingIds = async function () {
        // Billing ids can come from the following sources, in order of precedence
        //  - TeamType properties
        //  - flowforge.yml - teamType specific config
        //  - flowforge.yml - default config
        const defaults = {
            price: app.config.billing?.stripe?.teams?.[this.name]?.price || app.config.billing?.stripe?.team_price,
            product: app.config.billing?.stripe?.teams?.[this.name]?.product || app.config.billing?.stripe?.team_product
        }
        const result = {
            price: this.getProperty('billing.priceId', defaults.price),
            product: this.getProperty('billing.productId', defaults.product)
        }
        const trialProduct = this.getProperty('trial.productId')
        const trialPrice = this.getProperty('trial.priceId')
        if (trialProduct && trialPrice) {
            result.trialProduct = trialProduct
            result.trialPrice = trialPrice
        }
        return result
    }

    /**
     * Get billing details for devices in the team type
     * @returns object
     */
    app.db.models.TeamType.prototype.getDeviceBillingIds = async function () {
        // Billing ids can come from the following sources, in order of precedence
        //  - TeamType properties
        //  - flowforge.yml - default config
        const defaults = {
            price: app.config.billing?.stripe?.device_price,
            product: app.config.billing?.stripe?.device_product
        }
        return {
            price: this.getProperty('devices.priceId', defaults.price),
            product: this.getProperty('devices.productId', defaults.product)
        }
    }

    /**
     * Get billing details for a particular instanceType in this team type
     * @param {ProjectType} instanceType
     * @returns object
     */
    app.db.models.TeamType.prototype.getInstanceBillingIds = async function (instanceType) {
        // Billing ids can come from the following sources, in order of precedence
        //  - TeamType properties
        //  - InstanceType properties
        //  - flowforge.yml - default config
        const defaults = {
            price: instanceType.properties.billingPriceId || app.config.billing?.stripe?.project_price,
            product: instanceType.properties.billingProductId || app.config.billing?.stripe?.project_product
        }
        return {
            price: this.getInstanceTypeProperty(instanceType, 'priceId', defaults.price),
            product: this.getInstanceTypeProperty(instanceType, 'productId', defaults.product)
        }
    }
}
