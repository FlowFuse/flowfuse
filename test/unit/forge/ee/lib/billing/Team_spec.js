const should = require('should') // eslint-disable-line
const setup = require('../../setup')

describe('Team model - ee extensions', function () {
    // Use standard test data.
    let app

    after(async function () {
        await app.close()
        setup.resetStripe()
    })

    let billableTeamType
    let disabledBillingTeamType
    let billingEnabledTeam
    let billingMissingTeam
    let billingDisabledTeam
    let billingManualTeam

    before(async function () {
        setup.setupStripe()
        app = await setup({
            billing: {
                stripe: {
                    key: 1234,
                    team_product: 'defaultteamproduct',
                    team_price: 'defaultteamprice',
                    device_price: 'defaultdeviceprice',
                    device_product: 'defaultdeviceproduct'
                }
            }
        })

        billableTeamType = await app.db.models.TeamType.create({
            name: 'billableTeamType',
            properties: {
                devices: {
                    productId: 'prod_device',
                    priceId: 'price_device',
                    description: '$5/month'
                },
                instances: {
                    [app.projectType.hashid]: {
                        active: true,
                        productId: 'prod_instance',
                        priceId: 'price_instance',
                        description: '$20/month'
                    }
                },
                billing: {
                    productId: 'prod_team',
                    priceId: 'price_team',
                    description: '$10/month',
                    proration: 'always_invoice'
                },
                trial: {
                    active: false
                }
            },
            active: true
        })

        disabledBillingTeamType = await app.db.models.TeamType.create({
            name: 'disabledBillingTeamType',
            properties: {
                instances: {
                    [app.projectType.hashid]: {
                        active: true
                    }
                },
                billing: {
                    disabled: true
                }
            },
            active: true
        })

        billingEnabledTeam = await app.factory.createTeam({ name: 'billingEnabledTeam', TeamTypeId: billableTeamType.id })
        await app.factory.createSubscription(billingEnabledTeam)

        billingMissingTeam = await app.factory.createTeam({ name: 'billingMissingTeam', TeamTypeId: billableTeamType.id })

        billingManualTeam = await app.factory.createTeam({ name: 'billingManualTeam', TeamTypeId: billableTeamType.id })
        await app.billing.enableManualBilling(billingManualTeam)

        billingDisabledTeam = await app.factory.createTeam({ name: 'billingDisabledTeam', TeamTypeId: disabledBillingTeamType.id })
    })

    async function shouldResolve (promise) {
        try {
            await promise
        } catch (err) {
            should.not.exist(err)
        }
    }

    async function shouldReject (promise, code) {
        let result
        try {
            await promise
        } catch (err) {
            result = err
        }
        should.exist(result)
        result.should.have.property('code', code)
    }

    describe('Billing checks', function () {
        it('Billing Enabled Team', async function () {
            // All should pass as billing is properly configured for this team
            await shouldResolve(billingEnabledTeam.checkInstanceTypeCreateAllowed(app.projectType))
            await shouldResolve(billingEnabledTeam.checkInstanceStartAllowed())
            await shouldResolve(billingEnabledTeam.checkDeviceCreateAllowed())
        })
        it('Billing Missing Team', async function () {
            // All should reject as billing is missing
            await shouldReject(billingMissingTeam.checkInstanceTypeCreateAllowed(app.projectType), 'billing_required')
            await shouldReject(billingMissingTeam.checkInstanceStartAllowed(), 'billing_required')
            await shouldReject(billingMissingTeam.checkDeviceCreateAllowed(), 'billing_required')
        })
        it('Billing Manual Team', async function () {
            // All should pass as billing is in manual mode
            await shouldResolve(billingManualTeam.checkInstanceTypeCreateAllowed(app.projectType))
            await shouldResolve(billingManualTeam.checkInstanceStartAllowed())
            await shouldResolve(billingManualTeam.checkDeviceCreateAllowed())
        })
        it('Billing Disabled Team', async function () {
            // All should pass as billing is disabled for this team type
            await shouldResolve(billingDisabledTeam.checkInstanceTypeCreateAllowed(app.projectType))
            await shouldResolve(billingDisabledTeam.checkInstanceStartAllowed())
            await shouldResolve(billingDisabledTeam.checkDeviceCreateAllowed())
        })
    })
})
