import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { buildFeatureChecks } from '../../../../frontend/src/composables/FeatureChecks.ts'

function platformState ({ features = {}, settingsFeatures = {}, posthogFlags = {} } = {}) {
    return { features, settings: { features: settingsFeatures }, posthogFlags }
}

function team ({ features = {}, enableAllFeatures = false } = {}) {
    return { type: { properties: { features, enableAllFeatures } } }
}

describe('buildFeatureChecks', () => {
    describe('platform AND team features', () => {
        // isPrivateRegistryFeatureEnabled -> platformKey/teamKey 'npm'
        test('enabled only when both platform and team are enabled', () => {
            const checks = buildFeatureChecks(
                platformState({ features: { npm: true } }),
                team({ features: { npm: true } })
            )
            expect(checks.isPrivateRegistryFeatureEnabled).toBe(true)
            expect(checks.isPrivateRegistryFeatureEnabledForPlatform).toBe(true)
            expect(checks.isPrivateRegistryFeatureEnabledForTeam).toBe(true)
        })

        test('disabled when only platform is enabled', () => {
            const checks = buildFeatureChecks(
                platformState({ features: { npm: true } }),
                team({ features: { npm: false } })
            )
            expect(checks.isPrivateRegistryFeatureEnabled).toBe(false)
        })

        test('disabled when only team is enabled', () => {
            const checks = buildFeatureChecks(
                platformState({ features: { npm: false } }),
                team({ features: { npm: true } })
            )
            expect(checks.isPrivateRegistryFeatureEnabled).toBe(false)
        })

        test('disabled when neither is enabled', () => {
            const checks = buildFeatureChecks(platformState(), team())
            expect(checks.isPrivateRegistryFeatureEnabled).toBe(false)
        })
    })

    describe('team-only features', () => {
        // isDeviceGroupsFeatureEnabled -> teamKey 'deviceGroups'
        test('follows the team flag and has no platform check', () => {
            const checks = buildFeatureChecks(platformState(), team({ features: { deviceGroups: true } }))
            expect(checks.isDeviceGroupsFeatureEnabled).toBe(true)
            expect(checks.isDeviceGroupsFeatureEnabledForTeam).toBe(true)
            expect(checks.isDeviceGroupsFeatureEnabledForPlatform).toBeUndefined()
        })

        test('disabled when the team flag is off', () => {
            const checks = buildFeatureChecks(platformState(), team({ features: { deviceGroups: false } }))
            expect(checks.isDeviceGroupsFeatureEnabled).toBe(false)
        })

        test('enabled via team enableAllFeatures', () => {
            const checks = buildFeatureChecks(platformState(), team({ enableAllFeatures: true }))
            expect(checks.isDeviceGroupsFeatureEnabled).toBe(true)
        })
    })

    describe('platform-only features', () => {
        // isCertifiedNodesFeatureEnabled -> platformKey 'certifiedNodes'
        test('follows the platform flag and has no team check', () => {
            const checks = buildFeatureChecks(platformState({ features: { certifiedNodes: true } }), team())
            expect(checks.isCertifiedNodesFeatureEnabled).toBe(true)
            expect(checks.isCertifiedNodesFeatureEnabledForPlatform).toBe(true)
            expect(checks.isCertifiedNodesFeatureEnabledForTeam).toBeUndefined()
        })

        test('disabled when the platform flag is off', () => {
            const checks = buildFeatureChecks(platformState({ features: { certifiedNodes: false } }), team())
            expect(checks.isCertifiedNodesFeatureEnabled).toBe(false)
        })
    })

    describe('opt-out team check', () => {
        // isSharedLibraryFeatureEnabled -> keys 'shared-library', optOut: true
        test('enabled by default when the team flag is undefined', () => {
            const checks = buildFeatureChecks(
                platformState({ features: { 'shared-library': true } }),
                team()
            )
            expect(checks.isSharedLibraryFeatureEnabled).toBe(true)
        })

        test('disabled only when the team explicitly sets it false', () => {
            const checks = buildFeatureChecks(
                platformState({ features: { 'shared-library': true } }),
                team({ features: { 'shared-library': false } })
            )
            expect(checks.isSharedLibraryFeatureEnabled).toBe(false)
        })

        test('still gated by the platform flag', () => {
            const checks = buildFeatureChecks(
                platformState({ features: { 'shared-library': false } }),
                team()
            )
            expect(checks.isSharedLibraryFeatureEnabled).toBe(false)
        })
    })

    describe('platformSource: settings', () => {
        // isHTTPBearerTokensFeatureEnabled -> platformKey 'httpBearerTokens' from settings.features
        test('reads the platform flag from settings.features', () => {
            const checks = buildFeatureChecks(
                platformState({ settingsFeatures: { httpBearerTokens: true } }),
                team({ features: { teamHttpSecurity: true } })
            )
            expect(checks.isHTTPBearerTokensFeatureEnabled).toBe(true)
        })

        test('ignores the same key on the plain features object', () => {
            const checks = buildFeatureChecks(
                platformState({ features: { httpBearerTokens: true } }),
                team({ features: { teamHttpSecurity: true } })
            )
            expect(checks.isHTTPBearerTokensFeatureEnabled).toBe(false)
        })
    })

    describe('dependency gates', () => {
        // isExpertAssistantFeatureEnabled -> optOut, dependsOnPlatform 'ai', dependsOnTeam 'ai' (optOut)
        const enabledState = platformState({ features: { expertAssistant: true, ai: true } })

        test('enabled when the feature and its ai dependencies are enabled', () => {
            const checks = buildFeatureChecks(enabledState, team({ features: { expertAssistant: true, ai: true } }))
            expect(checks.isExpertAssistantFeatureEnabled).toBe(true)
        })

        test('forced false when the platform ai dependency is missing', () => {
            const checks = buildFeatureChecks(
                platformState({ features: { expertAssistant: true } }),
                team({ features: { expertAssistant: true, ai: true } })
            )
            expect(checks.isExpertAssistantFeatureEnabled).toBe(false)
        })

        test('forced false when the team ai dependency is explicitly disabled', () => {
            const checks = buildFeatureChecks(enabledState, team({ features: { expertAssistant: true, ai: false } }))
            expect(checks.isExpertAssistantFeatureEnabled).toBe(false)
        })
    })

    describe('posthogKey', () => {
        // isMcpThirdPartyFeatureEnabled -> platform+team+ai deps, posthogKey 'MCP_THIRD_PARTY'
        const fullyEnabledState = platformState({ features: { mcpThirdParty: true, ai: true } })
        const fullyEnabledTeam = team({ features: { mcpThirdParty: true, ai: true } })

        afterEach(() => {
            delete window.posthog
        })

        describe('when PostHog is available', () => {
            beforeEach(() => {
                window.posthog = {}
            })

            test('the flag value overrides a false platform/team result', () => {
                const checks = buildFeatureChecks(
                    platformState({ posthogFlags: { MCP_THIRD_PARTY: true } }),
                    team()
                )
                expect(checks.isMcpThirdPartyFeatureEnabled).toBe(true)
            })

            test('a false flag overrides an otherwise-enabled platform/team result', () => {
                const checks = buildFeatureChecks(
                    platformState({ features: { mcpThirdParty: true, ai: true }, posthogFlags: { MCP_THIRD_PARTY: false } }),
                    fullyEnabledTeam
                )
                expect(checks.isMcpThirdPartyFeatureEnabled).toBe(false)
            })

            test('a missing flag resolves to false', () => {
                const checks = buildFeatureChecks(fullyEnabledState, fullyEnabledTeam)
                expect(checks.isMcpThirdPartyFeatureEnabled).toBe(false)
            })
        })

        describe('when PostHog is unavailable', () => {
            test('falls back to the enabled platform/team result, ignoring the flag', () => {
                const checks = buildFeatureChecks(
                    platformState({ features: { mcpThirdParty: true, ai: true }, posthogFlags: { MCP_THIRD_PARTY: false } }),
                    fullyEnabledTeam
                )
                expect(checks.isMcpThirdPartyFeatureEnabled).toBe(true)
            })

            test('falls back to the disabled platform/team result', () => {
                const checks = buildFeatureChecks(
                    platformState({ features: { mcpThirdParty: true }, posthogFlags: { MCP_THIRD_PARTY: true } }),
                    fullyEnabledTeam
                )
                expect(checks.isMcpThirdPartyFeatureEnabled).toBe(false)
            })
        })
    })
})
