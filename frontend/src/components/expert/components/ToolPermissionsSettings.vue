<template>
    <div class="tool-permissions" data-el="expert-tool-permissions">
        <section class="tool-permissions__section">
            <span class="tool-permissions__section-title">Default permission by action type</span>
            <ul class="tool-permissions__rows">
                <li v-for="cls in classDefaults" :key="cls.key" class="tool-permissions__row">
                    <div class="tool-permissions__label">
                        <span class="tool-permissions__label-title">{{ cls.label }}</span>
                        <span class="tool-permissions__label-hint">{{ cls.hint }}</span>
                    </div>
                    <ff-listbox
                        class="tool-permissions__control"
                        selector="expert-tool-permission"
                        :model-value="toolDefaults[cls.key]"
                        :options="policyOptions"
                        :options-min-width="140"
                        @update:model-value="(value) => setToolClassDefault(cls.key, value)"
                    />
                </li>
            </ul>
        </section>

        <p v-if="!canUseWriteTools" class="tool-permissions__notice">
            Your role is read-only, so the Expert can use read-only tools but cannot run actions that change flows.
        </p>

        <!-- TODO(platform-tools): once Steve's platform-tool work is merged into the agent,
             the catalog will also carry platform UI / platform tools. Group `groupedTools`
             by tool target into sibling sections (Platform UI, Platform Tools, Flow Building
             Tools), each keeping the read/write/delete scope grouping below. Until then only
             flow-building tools exist, so a single section is rendered. -->
        <section class="tool-permissions__section">
            <span class="tool-permissions__section-title">Flow Building Tools</span>
            <template v-if="toolCatalog.length">
                <div v-for="group in groupedTools" :key="group.key" class="tool-permissions__group">
                    <span class="tool-permissions__group-title">{{ group.label }}</span>
                    <ul class="tool-permissions__rows">
                        <li v-for="tool in group.tools" :key="tool.familyKey" class="tool-permissions__row">
                            <div class="tool-permissions__label">
                                <span class="tool-permissions__tool-name">{{ tool.displayName }}</span>
                                <span
                                    v-if="tool.statusHint"
                                    class="tool-permissions__label-hint"
                                    :class="`is-${tool.status}`"
                                >{{ tool.statusHint }}</span>
                            </div>
                            <span
                                v-if="tool.control !== 'toggle'"
                                class="tool-permissions__static"
                            >{{ tool.statusLabel }}</span>
                            <ff-listbox
                                v-else
                                class="tool-permissions__control"
                                selector="expert-tool-permission"
                                :model-value="toolPolicyFor(tool.activeKey)"
                                :options="policyOptions"
                                :options-min-width="140"
                                @update:model-value="(value) => setFamilyPreference(tool.variantKeys, value)"
                            />
                        </li>
                    </ul>
                </div>
            </template>
            <p v-else class="tool-permissions__empty">No flow-building tools available yet.</p>
        </section>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'
import SemVer from 'semver'

import { hasAMinimumTeamRoleOf } from '../../../composables/Permissions.js'
import FfListbox from '../../../ui-components/components/form/ListBox.vue'
import { Roles } from '../../../utils/roles.js'

import { useContextStore } from '@/stores/context.js'
import { classOf, useProductAssistantStore } from '@/stores/product-assistant.js'

const CLASS_ORDER = ['read', 'write', 'delete']
const CLASS_LABELS = { read: 'Read', write: 'Write', delete: 'Delete' }
// Non-breaking hyphen in the product name so "nr-assistant" never wraps across
// two lines in the narrow hint column (a literal hyphen is a valid break point
// and CSS can't suppress breaks at real hyphens).
const NR_ASSISTANT = 'nr‑assistant'

export default {
    name: 'ToolPermissionsSettings',
    components: { FfListbox },
    computed: {
        ...mapState(useProductAssistantStore, ['toolCatalog', 'toolDefaults', 'toolPolicyFor', 'toolAvailabilityFor']),
        ...mapState(useContextStore, ['teamMembership']),
        canUseWriteTools () {
            return hasAMinimumTeamRoleOf(Roles.Member, this.teamMembership)
        },
        policyOptions () {
            return [
                { label: 'Always allow', value: 'allow' },
                { label: 'Ask', value: 'ask' },
                { label: 'Never', value: 'deny' }
            ]
        },
        classDefaults () {
            return [
                { key: 'read', label: 'Read', hint: 'View flows, palette and nodes' },
                { key: 'write', label: 'Write', hint: 'Add or change nodes, wires and tabs' },
                { key: 'delete', label: 'Delete', hint: 'Remove nodes, tabs and flows' }
            ]
        },
        groupedTools () {
            // Collapse versioned variants (e.g. "Manage Groups v1/v2") into one family,
            // keyed by stripped display name + class, then resolve each family against
            // the instance's nr-assistant version into a single displayed row.
            const families = new Map()
            for (const entry of this.toolCatalog) {
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

            const buckets = { read: [], write: [], delete: [] }
            for (const t of resolved) {
                (buckets[t.toolClass] || buckets.write).push(t)
            }
            return CLASS_ORDER
                .filter(key => buckets[key].length)
                .map(key => ({ key, label: CLASS_LABELS[key], tools: buckets[key] }))
        }
    },
    methods: {
        ...mapActions(useProductAssistantStore, ['setToolPreference', 'setToolClassDefault']),
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
    gap: 1rem;
    width: 100%;
}

.tool-permissions__section {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
}

.tool-permissions__section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ff-color-text);
}

.tool-permissions__group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.tool-permissions__group-title {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ff-color-text-subtle);
}

.tool-permissions__rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.tool-permissions__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.tool-permissions__label {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
}

.tool-permissions__label-title {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--ff-color-text);
}

.tool-permissions__label-hint {
    font-size: 0.6875rem;
    color: var(--ff-color-text-subtle);

    &.is-requires-update { color: var(--ff-color-status-info-text); }
    &.is-deprecated { color: var(--ff-color-status-error-text); }
}

.tool-permissions__tool-name {
    font-size: 0.8125rem;
    color: var(--ff-color-text-strong);
    overflow-wrap: anywhere;
}

.tool-permissions__notice,
.tool-permissions__empty {
    margin: 0;
    font-size: 0.75rem;
    color: var(--ff-color-text-subtle);
}

.tool-permissions__static {
    flex: none;
    font-size: 0.75rem;
    color: var(--ff-color-text-subtle);
}

// Compact the shared listbox so the control column stays narrow and the menu
// never sizes itself to the widest option label. The button renders in-place
// (only the options popup is teleported), so :deep reaches it from this scope.
:deep(.tool-permissions__control) {
    flex: none;
    width: 8.5rem;
    min-width: 0;

    .ff-button {
        padding: 0.25rem 0.5rem;
        border-radius: 5px;
        font-size: 0.8125rem;
        border-color: var(--ff-color-border-strong);

        .icon svg {
            width: 1.1rem;
            height: 1.1rem;
        }
    }
}
</style>
