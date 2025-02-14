module.exports.init = async function (app) {
    // Set the billing feature flag
    app.config.features.register('billing', true, true)

    const ONE_DAY = 86400000

    /** @type {import('stripe').default } */
    const stripe = require('stripe')(app.config.billing.stripe.key)

    app.housekeeper.registerTask({
        name: 'teamTrialManager',
        startup: false,
        schedule: '0,30  *  *  *  *',
        run: require('./trialTask').init(app)
    })

    app.postoffice.registerTemplate('TrialTeamCreated', require('./emailTemplates/TrialTeamCreated'))
    app.postoffice.registerTemplate('TrialTeamSuspended', require('./emailTemplates/TrialTeamSuspended'))
    app.postoffice.registerTemplate('TrialTeamEnded', require('./emailTemplates/TrialTeamEnded'))
    app.postoffice.registerTemplate('TrialTeamReminder', require('./emailTemplates/TrialTeamReminder'))

    // Augment the Team model with billing functions
    require('./Team')(app)
    require('./TeamType')(app)

    /**
     * Convert a user-friendly promo code to its api id, if valid.
     * @param {string} code The user-friendly promo code 'FREEDONUTS'
     * @returns the promoCode id (`promo_xyz`) if valid, null otherwise
     */
    async function getPromotionCode (code) {
        const promoCodes = await stripe.promotionCodes.list({ code, active: true })
        if (promoCodes.data?.length === 1) {
            return promoCodes.data[0]
        }
        return null
    }

    return {
        /**
         * Create a Stripe subscription session for the given team
         * The Stripe subscription will be populated with the appropriate items
         * As a user may be modifying their team type at the same time, this function
         * accepts an optional teamTypeId for the target team type. If that is not
         * provided, it will use the billing ids for the team's existing type.
         * @param {*} team The team to setup billing for
         * @param {*} user An optional user who may have credits associated with them
         * @param {*} teamTypeId An optional teamTypeId if the team is being upgraded at the same time
         * @returns A Stripe checkout session object
         */
        createSubscriptionSession: async (team, user = null, teamTypeId = null) => {
            // When setting up the initial subscription we'll default to the billing
            // ids of current team type. However, the subscription setup could be done
            // in conjunction with changing the team type. We do *not* modify
            // the team type here - because the user could abandon the stripe checkout
            // and they will expect to remain in their current trial/type

            // Get the specified TeamType, or default to the team's existing type
            const teamType = await (teamTypeId ? app.db.models.TeamType.byId(teamTypeId) : team.getTeamType())

            const billingIds = await teamType.getTeamBillingIds()
            const teamPrice = billingIds.price

            // Use existing Stripe customer
            const existingLocalSubscription = await team.getSubscription()

            const sub = {
                mode: 'subscription',
                metadata: {
                    teamTypeId: teamType.hashid
                },
                line_items: [{
                    price: teamPrice,
                    quantity: 1
                }],
                subscription_data: {
                    metadata: {
                        team: team.hashid
                    }
                },
                tax_id_collection: {
                    enabled: true
                },
                custom_text: {
                    submit: {
                        message: 'This sets up your team for billing.'
                    }
                },
                client_reference_id: team.hashid,
                payment_method_types: ['card'],
                success_url: `${app.config.base_url}/team/${team.slug}/applications?billing_session={CHECKOUT_SESSION_ID}`,
                cancel_url: `${app.config.base_url}/team/${team.slug}/applications`
            }

            // Need to ensure the subscription contains all of the expected items
            // to correlate with the teamType. This includes:
            // - Team Plan item - already added above
            // - Device item
            // - An item for each instance type

            // Get the billable counts of all instance/devices - taking into account free allowances
            const billableCounts = await app.billing.getTeamBillableCounts(team, teamType)
            if (billableCounts.billingIds.devices.product) {
                const deviceCount = billableCounts.devices
                if (deviceCount > 0) {
                    const deviceFreeAllocation = teamType.getProperty('devices.free', 0)
                    const billableCount = Math.max(0, deviceCount - deviceFreeAllocation)
                    if (billableCount > 0) {
                        // We have devices to include in the subscription
                        sub.line_items.push({
                            price: billableCounts.billingIds.devices.price,
                            quantity: billableCount
                        })
                    }
                }
            }

            for (const instanceType of Object.keys(billableCounts.instances)) {
                const instanceBillingIds = billableCounts.billingIds[instanceType]
                const billableCount = billableCounts.instances[instanceType]
                if (billableCount > 0) {
                    sub.line_items.push({
                        price: instanceBillingIds.price,
                        quantity: billableCount
                    })
                }
            }

            let userBillingCode
            let promoCode
            if (user) {
                // Check to see if this user has a billingCode associated
                userBillingCode = await app.billing.getUserBillingCode(user)
                if (userBillingCode) {
                    // Check to see if that is a valid stripe promotionCode
                    promoCode = await getPromotionCode(userBillingCode.code)
                }
            }

            if (existingLocalSubscription?.customer) {
                sub.customer = existingLocalSubscription.customer

                // Required for tax_id_collection
                sub.customer_update = {
                    name: 'auto'
                }

                if (promoCode?.restrictions?.first_time_transaction) {
                    // This promoCode has been configured for one use per customer
                    // As this is an existing customer (ie Team Subscription)
                    // we cannot proceed with this coupon. The only option is
                    // to continue without the coupon.
                    promoCode = null
                }
            }
            if (promoCode?.id) {
                sub.discounts = [
                    {
                        promotion_code: promoCode.id
                    }
                ]
                sub.custom_text.submit.message += ` We will apply the code ${userBillingCode.code} to your subscription.`
            } else {
                sub.allow_promotion_codes = true
            }

            // Set the flag to enable a free trial
            if (app.db.controllers.Subscription.freeTrialCreditEnabled() && user) {
                const newTeamAlreadyCreated = true // team is created before this step
                const eligibleForTrial = await app.db.controllers.Subscription.userEligibleForFreeTrialCredit(user, newTeamAlreadyCreated)

                if (eligibleForTrial) {
                    app.log.info(`User ${user.name} (${user.username}) is eligible for a free trial, set the flag in the subscription metadata.`)
                }

                sub.subscription_data.metadata.free_trial = eligibleForTrial
            }
            const session = await stripe.checkout.sessions.create(sub)
            app.log.info(`Creating Subscription for team ${team.hashid}` + (sub.discounts ? ` code='${userBillingCode.code}'` : ''))
            return session
        },
        /**
         * Add an instance to the team's billing.
         * This passes straight through to `app.billing.updateTeamBillingCounts` as
         * we no longer track individual instance billing state
         * @param {*} team The team to update billing for
         * @param {*} project The instance that was added
         * @returns
         */
        addProject: async (team, project) => {
            return app.billing.updateTeamBillingCounts(team)
        },

        /**
         * Remove an instance from the team's billing.
         * This passes straight through to `app.billing.updateTeamBillingCounts` as
         * we no longer track individual instance billing state
         * @param {*} team The team to update billing for
         * @param {*} project The instance that was removed
         * @returns
         */
        removeProject: async (team, project) => {
            return app.billing.updateTeamBillingCounts(team)
        },
        /**
         *
         * @param {*} team
         */
        endTeamTrial: async (team) => {
            // If a trial price is set, move it over to the proper team price
            const billingIds = await team.getTeamBillingIds()
            const subscription = await team.getSubscription()
            const prorationBehavior = await team.getBillingProrationBehavior()
            if (billingIds.trialPrice && billingIds.trialProduct) {
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscription)
                // The subscription should have an item for the trial product. It needs to
                // be removed and replaced with the billable team product
                const existingTrialItem = stripeSubscription.items.data.find(item => item.plan.product === billingIds.trialProduct)
                if (existingTrialItem) {
                    app.log.info(`Updating team ${team.hashid} subscription: adding team item`)
                    await stripe.subscriptions.update(subscription.subscription, {
                        proration_behavior: prorationBehavior,
                        items: [{
                            price: billingIds.price,
                            quantity: 1
                        }]
                    })
                    app.log.info(`Updating team ${team.hashid} subscription: removing trial item`)
                    await stripe.subscriptionItems.del(existingTrialItem.id, { proration_behavior: prorationBehavior })
                }
            }
            await app.billing.updateTeamBillingCounts(team)
        },

        /**
         * Gets the counts of all instances/devices that are billable. This takes
         * into account any free allocation a teamType may have.
         * It also includes the stripe billing ids to save looking them up multiple times
         * by the calling functions.
         * The response format is as follows. The keys under `instances` are the hashids
         * of the different instance types.
         * {
         *     instances: {
         *         abcde: 0,
         *         fghij: 1,
         *         klmno: 0
         *     },
         *     devices: 27,
         *     billingIds: {
         *         abcde: { price: 'stripe_price_id', product: 'stripe_product_id' },
         *         ....
         *         devices: { price: 'stripe_price_id', product: 'stripe_product_id' },
         *     }
         * }
         * @param {*} team The team to get the counts for
         * @param {*} teamType An optional teamType to get the billing ids for
         * @returns The billable counts and ids for the team
         */
        getTeamBillableCounts: async (team, teamType) => {
            await team.ensureTeamTypeExists()
            if (!teamType) {
                teamType = team.TeamType
            }
            const instanceCounts = await team.getBillableInstanceCountByType()
            const deviceCount = await team.deviceCount()
            let deviceFreeAllocation = 0
            const deviceCombinedFreeAllocationType = await teamType.getProperty('devices.combinedFreeType', null)

            const instanceTypes = await app.db.models.ProjectType.findAll()
            const billableCounts = {}
            const remainingFreeAllowance = {}
            const billingIds = {}
            // Do a first pass to calculate the billable counts for all items
            for (const instanceType of instanceTypes) {
                billingIds[instanceType.hashid] = await teamType.getInstanceBillingIds(instanceType)
                const count = instanceCounts[instanceType.hashid] || 0
                const freeAllowance = await teamType.getInstanceTypeProperty(instanceType, 'free', 0)
                billableCounts[instanceType.hashid] = Math.max(0, count - freeAllowance)
                remainingFreeAllowance[instanceType.hashid] = Math.max(0, freeAllowance - count)
            }
            if (deviceCombinedFreeAllocationType) {
                deviceFreeAllocation = remainingFreeAllowance[deviceCombinedFreeAllocationType] || 0
            } else {
                deviceFreeAllocation = await teamType.getProperty('devices.free', 0)
            }
            const deviceBillableCount = Math.max(0, deviceCount - deviceFreeAllocation)
            billingIds.devices = await teamType.getDeviceBillingIds()
            return {
                instances: billableCounts,
                devices: deviceBillableCount,
                billingIds
            }
        },
        /**
         * Called whenever any change occurs to the number of active instances
         * or devices.
         * This ensures the subscription has the right number of instances listed against
         * each billable type, taking into account free allocations
         * @param {Team} team
         */
        updateTeamBillingCounts: async (team) => {
            const subscription = await team.getSubscription()
            if (!subscription || (subscription.isUnmanaged() || !subscription.isActive())) {
                // - no subscription
                // - in unmanaged mode
                // - sub not active
                // = do nothing with the subscription
                return
            }
            const prorationBehavior = await team.getBillingProrationBehavior()

            // Get the billable counts of all instance/devices - taking into account free allowances
            const billableCounts = await app.billing.getTeamBillableCounts(team)
            // Next step is to validate the counts on stripe and make any changes needed
            const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscription)
            const existingItemsByProduct = {}
            const itemsToUpdate = []
            stripeSubscription.items.data.forEach(item => {
                existingItemsByProduct[item.price.product] = {
                    id: item.id,
                    price: item.price.id,
                    quantity: item.quantity
                }
            })
            for (const instanceType of Object.keys(billableCounts.instances)) {
                const instanceBillingIds = billableCounts.billingIds[instanceType]
                const instanceItem = existingItemsByProduct[instanceBillingIds.product]
                const billableCount = billableCounts.instances[instanceType]
                if (!instanceItem && billableCount > 0) {
                    // No existing subscription item, so add one
                    app.log.info(`Updating team ${team.hashid} subscription: set instance type ${instanceType} count to ${billableCount}`)
                    itemsToUpdate.push({
                        price: instanceBillingIds.price,
                        quantity: billableCount
                    })
                } else if (instanceItem && instanceItem.quantity !== billableCount) {
                    // Subscription quantity doesn't match what we think
                    if (billableCount === 0) {
                        // Remove from the subscription
                        app.log.info(`Updating team ${team.hashid} subscription: set instance type ${instanceType} count to ${billableCount} - removing item`)
                        delete instanceItem.quantity
                        instanceItem.deleted = true
                        itemsToUpdate.push(instanceItem)
                    } else {
                        // Update the existing item
                        app.log.info(`Updating team ${team.hashid} subscription: set instance type ${instanceType} count to ${billableCount}`)
                        instanceItem.quantity = billableCount
                        itemsToUpdate.push(instanceItem)
                    }
                }
            }
            // Now do Devices
            // const deviceBillingIds = await team.getDeviceBillingIds()
            if (billableCounts.billingIds.devices.product) {
                const deviceItem = existingItemsByProduct[billableCounts.billingIds.devices.product]
                const deviceBillableCount = billableCounts.devices
                if (deviceItem) {
                    // Device item already in the subscription
                    if (deviceItem.quantity !== deviceBillableCount) {
                        // Quantity doesn't match what we want
                        if (deviceBillableCount === 0) {
                            // Remove from the subscription
                            app.log.info(`Updating team ${team.hashid} subscription: set device count to ${deviceBillableCount} - removing item`)
                            delete deviceItem.quantity
                            deviceItem.deleted = true
                            itemsToUpdate.push(deviceItem)
                        } else {
                            // Update quantity
                            app.log.info(`Updating team ${team.hashid} subscription: set device count to ${deviceBillableCount}`)
                            deviceItem.quantity = deviceBillableCount
                            itemsToUpdate.push(deviceItem)
                        }
                    }
                } else if (deviceBillableCount > 0) {
                    // No existing device item, so add one
                    app.log.info(`Updating team ${team.hashid} subscription device count to ${deviceBillableCount}`)
                    itemsToUpdate.push({
                        price: billableCounts.billingIds.devices.price,
                        quantity: deviceBillableCount
                    })
                }
            }
            if (itemsToUpdate.length > 0) {
                // Apply updates to the subscription
                try {
                    await stripe.subscriptions.update(subscription.subscription, {
                        proration_behavior: prorationBehavior,
                        items: itemsToUpdate
                    })
                } catch (error) {
                    app.log.warn(`Problem updating team ${team.hashid} subscription: ${error.message}`)
                }
                // }
            }
        },

        closeSubscription: async (subscription) => {
            if (subscription.subscription) {
                app.log.info(`Canceling subscription ${subscription.subscription} for team ${subscription.Team.hashid}`)

                await stripe.subscriptions.del(subscription.subscription, {
                    invoice_now: true,
                    prorate: true
                })
            }
            subscription.status = app.db.models.Subscription.STATUS.CANCELED
            await subscription.save()
        },

        setupTrialTeamSubscription: async (team, user) => {
            const trialModelEnabled = team.TeamType.getProperty('trial.active', false)
            if (trialModelEnabled) {
                // teamTrialDuration: number of days the trial should run for
                const teamTrialDuration = await team.TeamType.getProperty('trial.duration', 0)
                const teamTrialInstanceTypeId = await team.TeamType.getProperty('trial.instanceType', null)
                if (teamTrialDuration) {
                    await app.db.controllers.Subscription.createTrialSubscription(
                        team,
                        Date.now() + teamTrialDuration * ONE_DAY
                    )
                    if (await team.TeamType.getProperty('trial.sendEmail', true)) {
                        const emailInserts = {
                            username: user.name,
                            teamName: team.name,
                            trialDuration: teamTrialDuration
                        }
                        if (teamTrialInstanceTypeId) {
                            const trialProjectType = await app.db.models.ProjectType.byId(teamTrialInstanceTypeId)
                            emailInserts.trialProjectTypeName = trialProjectType.name
                        }
                        await app.postoffice.send(
                            user,
                            'TrialTeamCreated',
                            emailInserts
                        )
                    }
                }
            }
        },
        getUserBillingCode: async (user) => {
            return app.db.controllers.UserBillingCode.getUserCode(user)
        },
        setUserBillingCode: async (user, code) => {
            // Validate this is an active code
            const promoCode = await getPromotionCode(code)
            if (promoCode?.id) {
                // This is a valid code - store the original user-facing code rather
                // than the underlying id. This will allow us to change the associated
                // promo for this code rather than tying to exactly one.
                return app.db.controllers.UserBillingCode.setUserCode(user, code)
            }
        },

        /**
         * This updates the team subscription on stripe as part of updating the
         * team type.
         *
         * It requires the team to have an active subscription - ie billing must
         * have been configured before a team can change its type.
         *
         * If the team has setup its subscription but is still in trial mode,
         * the trial is ended first.
         *
         * This code will remove all existing items from the stripe subscription,
         * then add back the new team plan item.
         *
         * It does *not* restore the device/instance billing items. They are added
         * back by a later stage of the process in ee/lib/billing/Team.js#updateTeamType
         */
        updateTeamType: async (team, targetTeamType) => {
            const subscription = await team.getSubscription()
            // The team must have billing setup with an active or unmanaged subscription before
            // it can change its type
            if (subscription && subscription.isUnmanaged()) {
                // Unmanaged subscription means the platform is not responsible
                // for managing the stripe configuration
                return
            }
            if (subscription && subscription.isActive()) {
                if (subscription.isTrial()) {
                    // This block can be removed in 1.14 as it is a condition
                    // we no longer support - but may have some lingering teams
                    // in this mode for the next 2 weeks from the point this
                    // is deployed to production.

                    // If in trial mode, the trial is first ended - you cannot
                    // carry a trial over to a new team type

                    app.log.info(`Team ${subscription.Team.hashid} ending trial - changing team type`)
                    // The following logic around ending a trial also sits in trialTask.js.
                    // There may be a cleaner refactoring to avoid the duplication, but
                    // that is for another day
                    await app.billing.endTeamTrial(team)
                    await subscription.clearTrialState()
                }

                // Get the stripe view of the subscription
                const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscription)

                // Get the team billing ids for the new team type
                const targetTeamBillingIds = await targetTeamType.getTeamBillingIds()
                const prorationBehavior = await team.getBillingProrationBehavior()

                try {
                    // Add the new team plan item
                    app.log.info(`Updating team ${team.hashid} subscription: updating to team plan ${targetTeamBillingIds.price}`)
                    const newItems = [{
                        price: targetTeamBillingIds.price,
                        quantity: 1
                    }]
                    // Remove all pre-existing items. They will get added back
                    // later with the new billing ids
                    for (const item of stripeSubscription.items.data) {
                        newItems.push({
                            id: item.id,
                            deleted: true
                        })
                    }
                    await stripe.subscriptions.update(subscription.subscription, {
                        proration_behavior: prorationBehavior,
                        items: newItems
                    })
                } catch (err) {
                    app.log.warn(`Problem updating team ${team.hashid} subscription: ${err.message}`)
                    throw err
                }
            } else {
                const err = new Error('Team subscription not active')
                err.code = 'billing_required'
                throw err
            }
        },
        /**
         * Flags the subscription as being unmanaged. This disables all interaction
         * with Stripe for this team.
         *
         * If the team has an active subscription, we will check the subscription
         * state on stripe and, if necessary, cancel the subscription.
         *
         * @param {*} team
         * @param {*} targetTeamType
         */
        enableManualBilling: async (team) => {
            app.log.info(`Enabling manual billing for team ${team.hashid}`)
            const subscription = await team.getSubscription()
            if (subscription) {
                const existingSubscription = subscription.subscription
                subscription.subscription = ''
                subscription.status = app.db.models.Subscription.STATUS.UNMANAGED
                subscription.trialEndsAt = null
                subscription.trialStatus = app.db.models.Subscription.TRIAL_STATUS.ENDED
                await subscription.save()

                // Now we have marked the local subscription as unmanaged, we need to
                // check to see if there is a stripe subscription to cancel
                if (existingSubscription) {
                    try {
                        const stripeSubscription = await stripe.subscriptions.retrieve(existingSubscription)
                        if (stripeSubscription && stripeSubscription.status !== 'canceled') {
                            app.log.info(`Canceling existing subscription ${existingSubscription} for team ${team.hashid}`)
                            // There is an existing subscription to cancel
                            try {
                                // We do not use `app.billing.closeSubscription` because
                                // that expects a Subscription object. However, we've already
                                // updated the local Subscription object to remove the information
                                // needed by closeSubscription. This is to ensure when the
                                // stripe callback arrives we don't trigger a suspension of
                                // the team resources.
                                await stripe.subscriptions.del(existingSubscription, {
                                    invoice_now: true,
                                    prorate: true
                                })
                            } catch (err) {
                                app.log.warn(`Error canceling existing subscription ${existingSubscription} for team ${team.hashid}: ${err.toString()}`)
                            }
                        }
                    } catch (err) {
                        // Could not find a matching stripe subscription - that's means
                        // we have nothing cancel
                    }
                }
            } else {
                // If the team bailed out of setting up stripe, they will not have
                // a subscription.
                await app.db.controllers.Subscription.createUnmanagedSubscription(team)
            }
        },
        /**
         * If in unmanaged mode, this will update the subscription to be 'canceled'
         * but leave all instances running.
         *
         * The team will need to create a new stripe subscription before they
         * can continue accessing the team.
         *
         * @param {*} team
         */
        disableManualBilling: async (team) => {
            app.log.info(`Disabling manual billing for team ${team.hashid}`)
            const subscription = await team.getSubscription()
            if (subscription && subscription.status === app.db.models.Subscription.STATUS.UNMANAGED) {
                subscription.status = app.db.models.Subscription.STATUS.CANCELED
                await subscription.save()
            }
        },
        updateTrialSettings: async (team, settings) => {
            // Team must already be in trial mode without a Stripe subscription
            const subscription = await team.getSubscription()
            const existingSubscription = subscription.subscription
            if (existingSubscription) {
                app.log.warn(`Cannot modify team ${team.hashid} trial settings as it already has a stripe subscription`)
                throw new Error('Team already has a subscription')
            }
            if (subscription.status === app.db.models.Subscription.STATUS.UNMANAGED) {
                app.log.warn(`Cannot modify team ${team.hashid} trial settings as it is unmanaged`)
                throw new Error('Team billing set to unmanaged')
            }
            if (settings.trialEndsAt) {
                if (typeof settings.trialEndsAt !== 'number') {
                    throw new Error('Invalid trialEndsAt value')
                }
                const delta = Math.abs(Date.now() - settings.trialEndsAt)
                if (delta > ONE_DAY * 366) {
                    throw new Error('Invalid trialEndsAt value - maximum trial period is 1 year')
                }
                app.log.info(`Setting team ${team.hashid} trial expiry to ${settings.trialEndsAt}`)
                subscription.trialEndsAt = settings.trialEndsAt
                subscription.trialStatus = app.db.models.Subscription.TRIAL_STATUS.CREATED
                await subscription.save()
            }
        }
    }
}
