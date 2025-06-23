import store from '../../../../store/index.js'

export function useInstanceFormHelper () {
    const _store = store

    const teamRuntimeLimitReached = () => {
        let teamTypeRuntimeLimit = _store.state.account.team.type.properties?.runtimes?.limit
        const currentRuntimeCount = _store.state.account.team.deviceCount + _store.state.account.team.instanceCount
        if (_store.state.account.team.billing?.trial && !_store.state.account.team.billing?.active && _store.state.account.team.type.properties?.trial?.runtimesLimit) {
            teamTypeRuntimeLimit = _store.state.account.team.type.properties?.trial?.runtimesLimit
        }
        return (teamTypeRuntimeLimit > 0 && currentRuntimeCount >= teamTypeRuntimeLimit)
    }

    const decorateInstanceTypes = (instanceTypes) => {
        // Do a first pass of the instance types to disable any not allowed for this team
        instanceTypes = instanceTypes.map(instanceType => {
            // Need to combine the projectType billing info with any overrides
            // from the current teamType
            const teamTypeInstanceProperties = _store.state.account.team.type.properties.instances[instanceType.id]
            const existingInstanceCount = _store.state.account.team.instanceCountByType?.[instanceType.id] || 0
            if (teamRuntimeLimitReached()) {
                // The overall limit has been reached
                instanceType.disabled = true
            } else if (teamTypeInstanceProperties) {
                if (!teamTypeInstanceProperties.active) {
                    // This instanceType is disabled for this teamType
                    instanceType.disabled = true
                } else if (teamTypeInstanceProperties.creatable === false) {
                    // Type is active (it can exist), but not creatable (not allowed to create more) for this team type.
                    // This can happen follow a change of TeamType where different instance types are available.
                    // This check treats undefined as true for backwards compatibility
                    instanceType.disabled = true
                } else if (teamTypeInstanceProperties.limit !== null && teamTypeInstanceProperties.limit <= existingInstanceCount) {
                    // This team has reached the limit of this instance type
                    instanceType.disabled = true
                }
            }

            return instanceType
        })

        if (_store.state.account.features.billing) {
        // With billing enabled, do a second pass through the instance types
        // to populate their billing info
            instanceTypes = instanceTypes.map(instanceType => {
            // Need to combine the projectType billing info with any overrides
            // from the current teamType
                const teamTypeInstanceProperties = _store.state.account.team.type.properties.instances[instanceType.id]
                let existingInstanceCount = _store.state.account.team.instanceCountByType?.[instanceType.id] || 0
                if (_store.state.account.team.type.properties.devices?.combinedFreeType === instanceType.id) {
                // Need to include device count as they use a combined free allocation
                    existingInstanceCount += _store.state.account.team.deviceCount
                }
                instanceType.price = ''
                instanceType.priceInterval = ''
                instanceType.currency = ''
                instanceType.cost = 0
                if (!instanceType.disabled && !_store.state.account.team.billing?.unmanaged) {
                    let billingDescription
                    if (teamTypeInstanceProperties) {
                    // TeamType provides metadata to use - do not fall back to instanceType
                        if (existingInstanceCount >= (teamTypeInstanceProperties.free || 0)) {
                            billingDescription = teamTypeInstanceProperties.description
                        } else {
                        // This team is still within its free allowance so clear
                        // the billingDescription
                        }
                    } else {
                        billingDescription = instanceType.properties?.billingDescription
                    }
                    if (billingDescription) {
                        [instanceType.price, instanceType.priceInterval] = billingDescription.split('/')
                        instanceType.currency = instanceType.price.replace(/[\d.]+/, '')
                        instanceType.cost = (Number(instanceType.price.replace(/[^\d.]+/, '')) || 0) * 100
                    } else {
                        instanceType.price = ''
                        instanceType.priceInterval = ''
                        instanceType.currency = ''
                        instanceType.cost = 0
                    }
                    if (_store.state.account.team.billing?.trial) {
                        if (_store.state.account.team.type.properties?.trial?.instanceType) {
                            const isTrialProjectType = instanceType.id === _store.state.account.team.type.properties?.trial?.instanceType
                            if (!_store.state.account.team.billing?.active) {
                            // No active billing - only allow the trial instance type
                                instanceType.disabled = !isTrialProjectType
                            }
                            if (isTrialProjectType && _store.state.account.team.billing?.trialProjectAllowed) {
                                instanceType.price = 'Free Trial'
                            // instanceType.priceInterval = instanceType.properties?.billingDescription
                            }
                        }
                    }
                }

                return instanceType
            })
        }

        return instanceTypes
    }

    return {
        decorateInstanceTypes
    }
}
