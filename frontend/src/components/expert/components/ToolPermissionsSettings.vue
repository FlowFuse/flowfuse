<template>
    <div class="tool-permissions" data-el="expert-tool-permissions">
        <section class="tool-permissions__section">
            <FormHeading>Flow Building Tools</FormHeading>
            <p class="tool-permissions__intro">
                Set a default for each action type, then override individual tools below.
            </p>
            <p v-if="!inEditor" class="tool-permissions__notice">
                Flow-building tools run in an instance editor. Open one to let the Expert use them; you can still set their permissions here.
            </p>
            <p v-if="!canUseWriteTools" class="tool-permissions__notice">
                Your role is read-only, so the Expert can use read-only tools but cannot run actions that change flows.
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
                            <ff-listbox
                                class="tool-permissions__control"
                                selector="expert-tool-permission"
                                :model-value="toolDefaults[cls.key]"
                                :options="policyOptions"
                                :options-min-width="140"
                                @update:model-value="(value) => setToolClassDefault(cls.key, value)"
                            />
                        </ff-data-table-cell>
                    </ff-data-table-row>
                </template>
            </ff-data-table>

            <ff-data-table v-if="resolvedTools.length" :columns="toolColumns" :show-search="false">
                <template #rows>
                    <ff-data-table-row v-for="tool in resolvedTools" :key="tool.familyKey">
                        <ff-data-table-cell>
                            <div class="tool-permissions__cell">
                                <span class="tool-permissions__title">{{ tool.displayName }}</span>
                                <span
                                    v-if="tool.statusHint"
                                    class="tool-permissions__hint"
                                    :class="`is-${tool.status}`"
                                >{{ tool.statusHint }}</span>
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
                            <ff-listbox
                                v-else
                                class="tool-permissions__control"
                                selector="expert-tool-permission"
                                :model-value="toolPolicyFor(tool.activeKey)"
                                :options="policyOptions"
                                :options-min-width="140"
                                @update:model-value="(value) => setFamilyPreference(tool.variantKeys, value)"
                            />
                        </ff-data-table-cell>
                    </ff-data-table-row>
                </template>
            </ff-data-table>
            <p v-else class="tool-permissions__empty">No flow-building tools available yet.</p>
        </section>

        <!-- TODO(platform-tools): once Steve's platform-tool work is merged into the agent,
             FlowFuse platform tools arrive in the same catalog. Render them here exactly like
             the Flow Building Tools section above: a defaults data-table for this group plus the
             per-tool data-table, filtering the catalog with groupOf(entry) === TOOL_GROUPS.PLATFORM.
             See groupOf / the toolDefaults TODO in stores/product-assistant.js for namespacing the
             defaults by group at the same time. -->
        <section class="tool-permissions__section">
            <FormHeading>FlowFuse Platform Tools</FormHeading>
            <p class="tool-permissions__empty">Available soon — added once FlowFuse platform tools ship.</p>
        </section>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'
import SemVer from 'semver'

import { hasAMinimumTeamRoleOf } from '../../../composables/Permissions.js'
import FfListbox from '../../../ui-components/components/form/ListBox.vue'
import { Roles } from '../../../utils/roles.js'
import FormHeading from '../../FormHeading.vue'

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
    components: { FfListbox, FormHeading },
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
        classDefaults () {
            return [
                { key: 'read', label: 'Read', hint: 'View flows, palette and nodes' },
                { key: 'write', label: 'Write', hint: 'Add or change nodes, wires and tabs' },
                { key: 'delete', label: 'Delete', hint: 'Remove nodes, tabs and flows' }
            ]
        },
        resolvedTools () {
            // Collapse versioned variants (e.g. "Manage Groups v1/v2") into one family,
            // keyed by stripped display name + class, then resolve each family against
            // the instance's nr-assistant version into a single displayed row. The flat
            // list is sorted read -> write -> delete so the table reads scope-first.
            const families = new Map()
            for (const entry of this.toolCatalog) {
                // Only flow-building tools belong in this section; platform tools (once
                // they exist) render in their own section (see groupOf / the TODO above).
                if (groupOf(entry) !== TOOL_GROUPS.FLOW_BUILDING) continue
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
        }
    },
    methods: {
        ...mapActions(useProductAssistantStore, ['setToolPreference', 'setToolClassDefault']),
        scopeLabel (cls) {
            return CLASS_LABELS[cls] || CLASS_LABELS.write
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
    gap: 1.5rem;
    width: 100%;
}

.tool-permissions__section {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
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

// Compact the shared listbox so the control column stays narrow and the menu
// never sizes itself to the widest option label. The button renders in-place
// (only the options popup is teleported), so :deep reaches it from this scope.
:deep(.tool-permissions__control) {
    min-width: 0;
    width: 9rem;

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
