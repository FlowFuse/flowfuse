/**
 * Feature flag configuration array. Each entry defines how a feature's availability
 * is computed from platform settings and team type properties.
 *
 * For each entry, `buildFeatureChecks` produces up to three computed properties:
 *   - `{output}ForPlatform` - platform-level check result (only if `platformKey` is set)
 *   - `{output}ForTeam`     - team-level check result (only if `teamKey` is set)
 *   - `{output}`            - combined result (see combination rules below)
 *
 * @property {string} output - Name of the computed property for the combined result.
 *   Always required. Convention: `is{Feature}FeatureEnabled`.
 *
 * @property {string} [platformKey] - Key to look up in the platform features object
 *   (state.features). If truthy, the platform check passes.
 *
 * @property {string} [teamKey] - Key to look up in team type properties
 *   (team.type.properties.features). If truthy or if the team type has
 *   `enableAllFeatures: true`, the team check passes.
 *
 * @property {boolean} [optOut=false] - Controls the default behavior of the team check.
 *   - `false` (default, opt-in): feature is disabled unless the team type explicitly
 *     enables it or has `enableAllFeatures: true`.
 *   - `true` (opt-out): feature is enabled by default. Only disabled if the team type
 *     explicitly sets it to `false`. If the property is `undefined`, it is treated as enabled.
 *   Only meaningful when `teamKey` is set. Ignored otherwise.
 *
 * @property {string} [platformSource] - Override where the platform value is read from.
 *   - `undefined` (default): reads from `state.features` (the platform feature flags)
 *   - `'settings'`: reads from `state.settings.features` instead (for features exposed
 *     through the settings object rather than the feature flags system)
 *   Only meaningful when `platformKey` is set. Ignored otherwise.
 *
 * @property {string} [dependsOn] - The `output` name of another feature that must be
 *   enabled (combined check) for this feature to be enabled. If the referenced feature's
 *   combined result is `false`, this feature is forced to `false`.
 *   The dependency must appear earlier in the array to ensure it is computed first.
 *
 * @property {string} [dependsOnPlatform] - A platform feature key that must be enabled
 *   for this feature to be enabled. Checked directly against the platform features object,
 *   independent of whether the dependency has its own entry in FEATURE_CONFIGS.
 *
 * @property {string} [dependsOnPlatformSource] - Override where the `dependsOnPlatform`
 *   value is read from, same semantics as `platformSource`.
 *   Only meaningful when `dependsOnPlatform` is set. Ignored otherwise.
 *
 * @property {string} [dependsOnTeam] - A team feature key that must be enabled for this
 *   feature to be enabled. Checked directly against the team type properties.
 *
 * @property {boolean} [dependsOnTeamOptOut] - Controls the default behavior of the
 *   `dependsOnTeam` check, same semantics as `optOut`.
 *   Only meaningful when `dependsOnTeam` is set. Ignored otherwise.
 *
 * Combination rules for the `{output}` property:
 *   - If both `platformKey` and `teamKey` are set: `platform AND team`
 *   - If only `platformKey` is set: `platform` only (platform-only feature)
 *   - If only `teamKey` is set: `team` only (team-only feature)
 *   - After the base combination, all `dependsOn*` gates are applied. If any
 *     dependency check fails, the combined result is forced to `false`.
 *
 * At least one of `platformKey` or `teamKey` must be provided.
 * `dependsOn`, `dependsOnPlatform`, and `dependsOnTeam` can be used together.
 */

interface FeatureConfig {
    output: string
    platformKey?: string
    teamKey?: string
    optOut?: boolean
    platformSource?: 'settings'
    dependsOn?: string
    dependsOnPlatform?: string
    dependsOnPlatformSource?: 'settings'
    dependsOnTeam?: string
    dependsOnTeamOptOut?: boolean
}

interface PlatformState {
    features?: Record<string, boolean>
    settings?: {
        features?: Record<string, boolean>
    }
}

interface TeamTypeProperties {
    features?: Record<string, boolean>
    enableAllFeatures?: boolean
}

interface Team {
    type?: {
        properties?: TeamTypeProperties
    }
}

type FeatureChecks = Record<string, boolean>

export const FEATURE_CONFIGS: FeatureConfig[] = [
    { output: 'isSharedLibraryFeatureEnabled', platformKey: 'shared-library', teamKey: 'shared-library', optOut: true },
    { output: 'isBlueprintsFeatureEnabled', platformKey: 'flowBlueprints', teamKey: 'flowBlueprints', optOut: true },
    { output: 'isCustomCatalogsFeatureEnabled', platformKey: 'customCatalogs', teamKey: 'customCatalogs', optOut: true },
    { output: 'isPrivateRegistryFeatureEnabled', platformKey: 'npm', teamKey: 'npm' },
    { output: 'isStaticAssetsFeatureEnabled', platformKey: 'staticAssets', teamKey: 'staticAssets' },
    { output: 'isHTTPBearerTokensFeatureEnabled', platformKey: 'httpBearerTokens', teamKey: 'teamHttpSecurity', platformSource: 'settings' },
    { output: 'isBOMFeatureEnabled', platformKey: 'bom', teamKey: 'bom' },
    { output: 'isTimelineFeatureEnabled', platformKey: 'projectHistory', teamKey: 'projectHistory' },
    { output: 'isMqttBrokerFeatureEnabled', platformKey: 'teamBroker', teamKey: 'teamBroker' },
    { output: 'isGitIntegrationFeatureEnabled', platformKey: 'gitIntegration', teamKey: 'gitIntegration' },
    { output: 'isInstanceResourcesFeatureEnabled', platformKey: 'instanceResources', teamKey: 'instanceResources' },
    { output: 'isTablesFeatureEnabled', platformKey: 'tables', teamKey: 'tables' },
    { output: 'isAiFeatureEnabled', platformKey: 'ai', teamKey: 'ai' },
    { output: 'isExpertAssistantFeatureEnabled', platformKey: 'expertAssistant', teamKey: 'expertAssistant', optOut: true, dependsOnPlatform: 'ai', dependsOnTeam: 'ai', dependsOnTeamOptOut: true },
    { output: 'isExpertInsightsFeatureEnabled', platformKey: 'expertInsights', teamKey: 'expertInsights', optOut: true, dependsOnPlatform: 'ai', dependsOnTeam: 'ai', dependsOnTeamOptOut: true },
    {
        output: 'isGeneratedSnapshotDescriptionFeatureEnabled',
        platformKey: 'generatedSnapshotDescription',
        teamKey: 'generatedSnapshotDescription',
        dependsOnPlatform: 'ai',
        dependsOnTeam: 'ai',
        dependsOnTeamOptOut: true
    },
    { output: 'isApplicationsRBACFeatureEnabled', platformKey: 'rbacApplication', teamKey: 'rbacApplication' },

    // Team-only
    { output: 'isDeviceGroupsFeatureEnabled', teamKey: 'deviceGroups' },

    // Platform-only
    { output: 'isCertifiedNodesFeatureEnabled', platformKey: 'certifiedNodes' },
    { output: 'isFlowFuseNodesFeatureEnabled', platformKey: 'ffNodes' },
    { output: 'isInstanceAutoStackUpdateFeatureEnabled', platformKey: 'autoStackUpdate' },
    { output: 'isDevOpsPipelinesFeatureEnabled', platformKey: 'devops-pipelines' },
    { output: 'isExternalMqttBrokerFeatureEnabled', platformKey: 'externalBroker' }
]

function isPlatformFeatureEnabled (state: PlatformState, platformKey: string, platformSource?: 'settings'): boolean {
    const source = platformSource === 'settings' ? state.settings?.features : state.features
    return !!source?.[platformKey]
}

function isTeamFeatureEnabled (team: Team | null | undefined, teamKey: string, optOut?: boolean): boolean {
    if (optOut) {
        const flag = team?.type?.properties?.features?.[teamKey]
        return (flag === undefined || !!flag) || !!team?.type?.properties?.enableAllFeatures
    }
    return !!team?.type?.properties?.features?.[teamKey] || !!team?.type?.properties?.enableAllFeatures
}

function applyDependencyGates (
    checks: FeatureChecks,
    output: string,
    config: FeatureConfig,
    state: PlatformState,
    team: Team | null | undefined
): void {
    if (config.dependsOn && !checks[config.dependsOn]) {
        checks[output] = false
    }
    if (config.dependsOnPlatform && !isPlatformFeatureEnabled(state, config.dependsOnPlatform, config.dependsOnPlatformSource)) {
        checks[output] = false
    }
    if (config.dependsOnTeam && !isTeamFeatureEnabled(team, config.dependsOnTeam, config.dependsOnTeamOptOut)) {
        checks[output] = false
    }
}

export function buildFeatureChecks (state: PlatformState, team: Team | null | undefined): FeatureChecks {
    const checks: FeatureChecks = {}

    for (const config of FEATURE_CONFIGS) {
        const { output, platformKey, teamKey, optOut, platformSource } = config
        const platformCheckKey = `${output}ForPlatform`
        const teamCheckKey = `${output}ForTeam`

        if (platformKey) {
            checks[platformCheckKey] = isPlatformFeatureEnabled(state, platformKey, platformSource)
        }

        if (teamKey) {
            checks[teamCheckKey] = isTeamFeatureEnabled(team, teamKey, optOut)
        }

        if (platformKey && teamKey) {
            checks[output] = checks[platformCheckKey] && checks[teamCheckKey]
        } else if (platformKey) {
            checks[output] = checks[platformCheckKey]
        } else if (teamKey) {
            checks[output] = checks[teamCheckKey]
        }

        applyDependencyGates(checks, output, config, state, team)
    }

    return checks
}
