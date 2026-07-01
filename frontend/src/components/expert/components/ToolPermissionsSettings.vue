<template>
    <div class="tool-permissions" data-el="expert-tool-permissions">
        <p v-if="!inEditor" class="tool-permissions__notice">
            Flow-building tools run in an instance editor. Open one to let the Expert use them; you can still set their permissions here.
        </p>
        <p v-if="!canUseWriteTools" class="tool-permissions__notice">
            Your role is read-only, so the Expert can use read-only tools but cannot run actions that change flows.
        </p>

        <section v-for="group in orderedGroups" :key="group.key" class="tool-permissions__section">
            <h4 class="tool-permissions__group-title">{{ group.title }}</h4>

            <div class="tool-permissions__block">
                <p class="tool-permissions__subtitle">Default permissions</p>
                <p class="tool-permissions__intro">
                    Choose what the Expert may do by default for each action type. Override individual tools below.
                </p>
                <ff-data-table :columns="defaultColumns" :show-search="false">
                    <template #rows>
                        <ff-data-table-row v-for="cls in classDefaults" :key="cls.key">
                            <ff-data-table-cell>
                                <div class="tool-permissions__cell">
                                    <span class="tool-permissions__title">{{ cls.label }}</span>
                                    <span class="tool-permissions__hint">{{ cls.hint }}</span>
                                </div>
                            </ff-data-table-cell>
                            <ff-data-table-cell class="permission-col">
                                <ToggleButtonGroup
                                    class="tool-permissions__toggle"
                                    size="small"
                                    :uses-links="false"
                                    :buttons="policyButtons"
                                    :model-value="teamGroupDefaults(group.key)[cls.key]"
                                    @update:model-value="(value) => setToolClassDefault(group.key, cls.key, value)"
                                />
                            </ff-data-table-cell>
                        </ff-data-table-row>
                    </template>
                </ff-data-table>
            </div>

            <ff-accordion v-if="group.tools.length" label="Individual tools" :set-open="false">
                <template #content>
                    <ff-data-table :columns="toolColumns" :show-search="false">
                        <template #rows>
                            <ff-data-table-row v-for="tool in group.tools" :key="tool.familyKey">
                                <ff-data-table-cell>
                                    <div class="tool-permissions__cell">
                                        <span class="tool-permissions__title">{{ tool.displayName }}</span>
                                        <span
                                            v-if="tool.statusHint"
                                            class="tool-permissions__hint"
                                            :class="`is-${tool.status}`"
                                        >{{ tool.statusHint }}</span>
                                        <span v-if="sessionNoteFor(tool.activeKey)" class="tool-permissions__session">
                                            {{ sessionNoteFor(tool.activeKey) }}
                                            <ff-button kind="tertiary" size="small" @click="promoteSessionOverride(tool.activeKey)">
                                                Make permanent
                                            </ff-button>
                                        </span>
                                    </div>
                                </ff-data-table-cell>
                                <ff-data-table-cell>
                                    <span class="tool-permissions__type">{{ scopeLabel(tool.toolClass) }}</span>
                                </ff-data-table-cell>
                                <ff-data-table-cell class="permission-col">
                                    <span
                                        v-if="tool.control !== 'toggle'"
                                        class="tool-permissions__static"
                                    >{{ tool.statusLabel }}</span>
                                    <ToggleButtonGroup
                                        v-else
                                        class="tool-permissions__toggle"
                                        size="small"
                                        :uses-links="false"
                                        :buttons="policyButtons"
                                        :model-value="savedToolPolicyFor(tool.activeKey)"
                                        @update:model-value="(value) => setFamilyPreference(tool.variantKeys, value)"
                                    />
                                </ff-data-table-cell>
                            </ff-data-table-row>
                        </template>
                    </ff-data-table>
                </template>
            </ff-accordion>
            <p v-else class="tool-permissions__empty">{{ group.empty }}</p>
        </section>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'
import SemVer from 'semver'

import { hasAMinimumTeamRoleOf } from '../../../composables/Permissions.js'
import { Roles } from '../../../utils/roles.js'
import Accordion from '../../Accordion.vue'
import ToggleButtonGroup from '../../elements/ToggleButtonGroup.vue'

import { useContextStore } from '@/stores/context.js'
import { TOOL_GROUPS, classOf, groupOf, useProductAssistantStore } from '@/stores/product-assistant.js'

const CLASS_ORDER = ['read', 'write', 'delete']
const CLASS_LABELS = { read: 'Read', write: 'Write', delete: 'Delete' }
// Non-breaking hyphen in the product name so "nr-assistant" never wraps across
// two lines in the narrow hint column (a literal hyphen is a valid break point
// and CSS can't suppress breaks at real hyphens).
const NR_ASSISTANT = 'nr‑assistant'

export default {
    name: 'ToolPermissionsSettings',
    components: { ToggleButtonGroup, 'ff-accordion': Accordion },
    props: {
        // Whether the user is in an instance editor, where flow-building tools can
        // actually run. Outside it the tools are still listed (and configurable) but
        // shown as usable only once an editor is open.
        inEditor: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        ...mapState(useProductAssistantStore, ['toolCatalog', 'teamGroupDefaults', 'savedToolPolicyFor', 'sessionOverrideFor', 'toolAvailabilityFor']),
        ...mapState(useContextStore, ['teamMembership']),
        canUseWriteTools () {
            return hasAMinimumTeamRoleOf(Roles.Member, this.teamMembership)
        },
        // Where the user is: in the immersive editor, flow-building tools are the focus, so
        // that section leads; on the platform (ff-app) the platform tools lead instead.
        isImmersive () {
            return useContextStore().expert?.scope === 'immersive'
        },
        policyButtons () {
            return [
                { title: 'Always allow', value: 'allow' },
                { title: 'Ask', value: 'ask' },
                { title: 'Always deny', value: 'deny' }
            ]
        },
        defaultColumns () {
            return [
                { label: 'Action', key: 'action' },
                { label: 'Permission', key: 'permission', class: 'permission-col' }
            ]
        },
        toolColumns () {
            return [
                { label: 'Tool', key: 'tool' },
                { label: 'Type', key: 'type' },
                { label: 'Permission', key: 'permission', class: 'permission-col' }
            ]
        },
        // Class hints stay generic so they read correctly for both flow-building and
        // platform tools (each group has its own defaults).
        classDefaults () {
            return [
                { key: 'read', label: 'Read', hint: 'View only, no changes' },
                { key: 'write', label: 'Write', hint: 'Create or change resources' },
                { key: 'delete', label: 'Delete', hint: 'Remove resources' }
            ]
        },
        // The two tool sections, ordered by where the user is (see isImmersive).
        orderedGroups () {
            const flow = {
                key: TOOL_GROUPS.FLOW_BUILDING,
                title: 'Flow Building Tools',
                tools: this.groupTools(TOOL_GROUPS.FLOW_BUILDING),
                empty: 'No flow-building tools available yet.'
            }
            const platform = {
                key: TOOL_GROUPS.PLATFORM,
                title: 'FlowFuse Platform Tools',
                tools: this.groupTools(TOOL_GROUPS.PLATFORM),
                empty: 'Individual platform tools appear here once they ship.'
            }
            return this.isImmersive ? [flow, platform] : [platform, flow]
        }
    },
    methods: {
        ...mapActions(useProductAssistantStore, ['setToolPreference', 'setToolClassDefault', 'promoteSessionOverride']),
        scopeLabel (cls) {
            return CLASS_LABELS[cls] || CLASS_LABELS.write
        },
        // The label under a tool name when this chat has a session grant for it, else null.
        sessionNoteFor (key) {
            const p = this.sessionOverrideFor(key)
            if (p === 'allow') return 'Allowed for this chat'
            if (p === 'deny') return 'Denied for this chat'
            return null
        },
        // Collapse versioned variants (e.g. "Manage Groups v1/v2") into one family, keyed
        // by stripped display name + class, then resolve each family against the instance's
        // nr-assistant version into a single displayed row. Sorted read -> write -> delete
        // so the table reads scope-first.
        groupTools (group) {
            const families = new Map()
            for (const entry of this.toolCatalog) {
                if (groupOf(entry) !== group) continue
                const displayName = this.displayName(entry)
                const cls = classOf(entry)
                const familyKey = `${cls}::${displayName}`
                if (!families.has(familyKey)) {
                    families.set(familyKey, { familyKey, displayName, toolClass: cls, variants: [] })
                }
                families.get(familyKey).variants.push(entry)
            }

            const resolved = []
            for (const fam of families.values()) {
                const r = this.resolveFamily(fam.variants)
                resolved.push({
                    familyKey: fam.familyKey,
                    displayName: fam.displayName,
                    toolClass: fam.toolClass,
                    status: r.status,
                    activeKey: r.activeKey,
                    variantKeys: fam.variants.map(v => v.key),
                    ...this.describeControl(fam.toolClass, r)
                })
            }

            return resolved.sort((a, b) =>
                CLASS_ORDER.indexOf(a.toolClass) - CLASS_ORDER.indexOf(b.toolClass) ||
                a.displayName.localeCompare(b.displayName)
            )
        },
        // Hide the internal version suffix (e.g. "Manage Groups v2") from the
        // user-facing label; versioned variants are reconciled into one family.
        displayName (tool) {
            const name = tool.name || tool.key || ''
            return name.replace(/[ _-]?[vV]\d+$/, '').trim() || name
        },
        // A family-wide preference is written to every variant key, so the user's
        // choice survives a version bump (when the active variant changes v1 -> v2).
        setFamilyPreference (variantKeys, policy) {
            for (const key of variantKeys) {
                this.setToolPreference(key, policy)
            }
        },
        // Resolve a family's variants into the single row to display: the usable
        // (in-range) variant if any, otherwise the reason it can't be used.
        resolveFamily (variants) {
            const withAvail = variants.map(v => ({ v, a: this.toolAvailabilityFor(v) }))
            const available = withAvail.filter(x => x.a.status === 'available')
            const hasNewer = withAvail.some(x => x.a.status === 'requires-update')
            if (available.length) {
                const chosen = available.sort((a, b) => this.compareMin(a.v, b.v)).pop()
                return {
                    status: 'available',
                    activeKey: chosen.v.key,
                    // In-range but a newer variant exists (or a max is set) -> nudge an update.
                    deprecated: chosen.a.deprecated || hasNewer,
                    requiredVersion: hasNewer ? this.latestRequiredVersion(withAvail) : null
                }
            }
            const needsUpdate = withAvail.filter(x => x.a.status === 'requires-update')
            if (needsUpdate.length) {
                return { status: 'requires-update', activeKey: needsUpdate[0].v.key, deprecated: false, requiredVersion: this.latestRequiredVersion(withAvail) }
            }
            return { status: 'deprecated', activeKey: variants[0].key, deprecated: true, requiredVersion: null }
        },
        // What the right-hand control should be, plus any hint under the tool name.
        describeControl (toolClass, r) {
            if (r.status === 'requires-update') {
                return {
                    control: 'status',
                    statusLabel: 'Update required',
                    statusHint: r.requiredVersion ? `Needs ${NR_ASSISTANT} ${r.requiredVersion}` : `Update ${NR_ASSISTANT} to enable`
                }
            }
            if (r.status === 'deprecated') {
                return { control: 'status', statusLabel: 'Deprecated', statusHint: `No longer available — update ${NR_ASSISTANT}` }
            }
            if (toolClass !== 'read' && !this.canUseWriteTools) {
                return { control: 'role', statusLabel: 'Unavailable', statusHint: '' }
            }
            return {
                control: 'toggle',
                statusLabel: '',
                statusHint: r.deprecated ? `Newer version available — update ${NR_ASSISTANT}` : ''
            }
        },
        compareMin (a, b) {
            const av = a.minVersion
            const bv = b.minVersion
            if (av && bv && SemVer.valid(av) && SemVer.valid(bv)) return SemVer.compare(av, bv)
            if (av && !bv) return 1
            if (!av && bv) return -1
            return 0
        },
        // The version the user should update to: the min version of the NEWEST
        // variant (highest required), not the lowest. Pointing at the lowest would
        // send them to an older variant that may already be capped (deprecated),
        // a dead-end; the highest lands them on the current tool.
        latestRequiredVersion (withAvail) {
            const reqs = withAvail.map(x => x.a.requiredVersion).filter(v => v && SemVer.valid(v))
            if (!reqs.length) return null
            return reqs.sort(SemVer.compare).pop()
        }
    }
}
</script>

<style scoped lang="scss">
.tool-permissions {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    width: 100%;
}

.tool-permissions__section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

// Group title (Flow Building / Platform) — a subheading under the dialog's
// "Tool permissions" heading, so it reads as subordinate rather than a peer.
.tool-permissions__group-title {
    margin: 0;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--ff-color-border);
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--ff-color-text);
}

.tool-permissions__block {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.tool-permissions__subtitle {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--ff-color-text);
}

.tool-permissions__intro {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--ff-color-text-subtle);
}

.tool-permissions__cell {
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.tool-permissions__title {
    font-weight: 500;
    color: var(--ff-color-text);
}

.tool-permissions__hint {
    font-size: 0.75rem;
    color: var(--ff-color-text-subtle);

    &.is-requires-update { color: var(--ff-color-status-info-text); }
    &.is-deprecated { color: var(--ff-color-status-error-text); }
}

.tool-permissions__type {
    color: var(--ff-color-text-subtle);
}

.tool-permissions__static {
    font-size: 0.8125rem;
    color: var(--ff-color-text-subtle);
}

// The "X for this chat" note + its Make permanent action, under a tool name. Wraps so
// the action drops to its own line (with full width) in the narrow tool column rather
// than being squeezed and clipped.
.tool-permissions__session {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: var(--ff-color-status-info-text);
}

.tool-permissions__notice,
.tool-permissions__empty {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--ff-color-text-subtle);
}

// Keep the permission column hugging the right edge so each tool name lines up
// with its own control across the row border, rather than floating in whitespace.
:deep(.permission-col) {
    width: 1px;
    white-space: nowrap;
    text-align: right;
}

// The class lands on the toggle's own root element, so it styles without :deep. The
// button size is set through ToggleButtonGroup's `size` prop, not by reaching inside it.
// inline-flex lets the right-aligned permission column push the control to the edge.
.tool-permissions__toggle {
    display: inline-flex;
}
</style>

<!-- Floor the equal-width segments so the longest policy label fits. -->
<style lang="scss">
.tool-permissions__toggle .ff-btn {
    min-width: 6.5rem;
}
</style>
