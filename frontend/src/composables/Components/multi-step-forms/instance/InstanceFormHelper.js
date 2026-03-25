import store from '../../../../store/index.js'
import { getTeamProperty } from '../../../TeamProperties.js'

import { useAccountTeamStore } from '@/stores/account-team.js'

export function useInstanceFormHelper () {
    const _store = store

    const teamRuntimeLimitReached = () => {
        const team = useAccountTeamStore().team
        let teamTypeRuntimeLimit = getTeamProperty(team, 'runtimes.limit')
        const currentRuntimeCount = (team?.deviceCount ?? 0) + (team?.instanceCount ?? 0)
        if (team?.billing?.trial && !team?.billing?.active && getTeamProperty(team, 'trial.runtimesLimit')) {
            teamTypeRuntimeLimit = getTeamProperty(team, 'trial.runtimesLimit')
        }
        return (teamTypeRuntimeLimit > 0 && currentRuntimeCount >= teamTypeRuntimeLimit)
    }

    const decorateInstanceTypes = (instanceTypes) => {
        const team = useAccountTeamStore().team
        // Do a first pass of the instance types to disable any not allowed for this team
        instanceTypes = instanceTypes.map(instanceType => {
            // Need to combine the projectType billing info with any overrides
            // from the current teamType
            const existingInstanceCount = team?.instanceCountByType?.[instanceType.id] || 0
            if (teamRuntimeLimitReached()) {
                // The overall limit has been reached
                instanceType.disabled = true
            } else {
                // Get individual properties to ensure we pickup any team overrides
                if (!getTeamProperty(team, `instances.${instanceType.id}.active`)) {
                    // This instanceType is disabled for this teamType
                    instanceType.disabled = true
                } else if (getTeamProperty(team, `instances.${instanceType.id}.creatable`) === false) {
                    // Type is active (it can exist), but not creatable (not allowed to create more) for this team type.
                    // This can happen follow a change of TeamType where different instance types are available.
                    // This check treats undefined as true for backwards compatibility
                    instanceType.disabled = true
                } else {
                    const limit = getTeamProperty(team, `instances.${instanceType.id}.limit`)
                    if (limit !== null && limit <= existingInstanceCount) {
                        // This team has reached the limit of this instance type
                        instanceType.disabled = true
                    }
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
                let existingInstanceCount = team?.instanceCountByType?.[instanceType.id] || 0
                if (getTeamProperty(team, 'devices.combinedFreeType') === instanceType.id) {
                // Need to include device count as they use a combined free allocation
                    existingInstanceCount += team?.deviceCount ?? 0
                }
                instanceType.price = ''
                instanceType.priceInterval = ''
                instanceType.currency = ''
                instanceType.cost = 0
                if (!instanceType.disabled && !team?.billing?.unmanaged) {
                    let billingDescription
                    const teamTypeFreeCount = getTeamProperty(team, `instances.${instanceType.id}.free`)
                    // Get the right description based on the billing interval
                    let descriptionKey = 'description'
                    if (team?.billing?.interval === 'year') {
                        descriptionKey = 'yrDescription'
                    }
                    const teamTypeDescription = getTeamProperty(team, `instances.${instanceType.id}.${descriptionKey}`)
                    if (teamTypeDescription) {
                    // TeamType provides metadata to use - do not fall back to instanceType
                        if (existingInstanceCount >= (teamTypeFreeCount || 0)) {
                            billingDescription = teamTypeDescription
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
                    if (team?.billing?.trial) {
                        if (getTeamProperty(team, 'trial.instanceType')) {
                            const isTrialProjectType = instanceType.id === getTeamProperty(team, 'trial.instanceType')
                            if (!team?.billing?.active) {
                            // No active billing - only allow the trial instance type
                                instanceType.disabled = !isTrialProjectType
                            }
                            if (isTrialProjectType && team?.billing?.trialProjectAllowed) {
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
