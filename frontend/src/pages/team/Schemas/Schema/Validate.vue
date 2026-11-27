<template>
    <div class="flex flex-col gap-6" data-el="schema-validate">
        <TabToolbar>
            <ff-button kind="tertiary" data-action="back-to-editing" :to="{ name: 'team-schema-editor' }">
                <template #icon-left><ChevronLeftIcon /></template>
                Back to editing
            </ff-button>
            <p class="schema-validate__intro">See how a message lines up against the schema, field by field.</p>
            <template v-if="targets.length" #tools>
                <span class="schema-validate__label">Check against</span>
                <ToggleButtonGroup :model-value="against" :buttons="targets" :uses-links="false" title="Check against" visually-hide-title data-el="validate-against" @update:model-value="pick" />
            </template>
        </TabToolbar>

        <p v-if="!targets.length" class="schema-validate__empty" data-el="validate-unavailable">This schema has no draft or published version to check a message against yet.</p>
        <template v-else>
            <div v-if="banner" class="schema-validate__banner" :class="`schema-validate__banner--${banner.kind}`" data-el="validate-banner">
                <component :is="banner.icon" class="ff-icon" />
                {{ banner.text }}
            </div>
            <div class="schema-validate__body">
                <div class="schema-validate__results">
                    <ff-data-table v-if="rows.length" :columns="columns" data-el="validate-results">
                        <template #rows>
                            <ff-data-table-row v-for="row in rows" :key="row.path" :data-el="`validate-row-${row.path}`" :data-result="row.result">
                                <ff-data-table-cell class="schema-validate__icon-cell">
                                    <component :is="ICONS[row.result]" class="ff-icon-sm" :class="`schema-validate__icon--${row.result}`" />
                                </ff-data-table-cell>
                                <ff-data-table-cell class="font-mono">{{ row.path }}</ff-data-table-cell>
                                <ff-data-table-cell class="font-mono schema-validate__muted">{{ row.type }}</ff-data-table-cell>
                                <ff-data-table-cell class="font-mono schema-validate__value-cell" :class="{ 'schema-validate__muted': !row.present }">
                                    <span class="schema-validate__value" :title="row.value">{{ row.value }}</span>
                                </ff-data-table-cell>
                                <ff-data-table-cell :class="`schema-validate__result--${row.result}`" data-el="validate-result">{{ row.message }}</ff-data-table-cell>
                            </ff-data-table-row>
                        </template>
                    </ff-data-table>
                    <p v-else class="schema-validate__empty" data-el="validate-hint">{{ hint }}</p>
                </div>
                <div class="schema-validate__payload">
                    <label for="validate-payload" class="schema-validate__payload-label">Message payload</label>
                    <p class="schema-validate__payload-help">Paste a message, or generate one from the schema.</p>
                    <textarea id="validate-payload" v-model="payloadText" class="schema-validate__textarea" rows="16" spellcheck="false" data-el="validate-payload" />
                    <div class="flex gap-2">
                        <ff-button kind="secondary" size="small" data-action="example-from-schema" :disabled="!document" @click="fillExample">Example from schema</ff-button>
                        <ff-button kind="secondary" size="small" data-action="clear-payload" :disabled="!payloadText" @click="payloadText = ''">Clear</ff-button>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, ChevronLeftIcon, InformationCircleIcon, MinusCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { computed, markRaw, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import TabToolbar from './components/TabToolbar.vue'
import { type ValidationRow, exampleFromSchema, validationRows } from './components/validation'

import type { ValidationError } from '@/api/schemas'
import ToggleButtonGroup from '@/components/elements/ToggleButtonGroup.vue'
import Alerts from '@/services/alerts.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import { debounce } from '@/utils/eventHandling'

// the schema page hands every tab the editor's state for the draft, which this one has no use for
defineOptions({ name: 'SchemaValidate', inheritAttrs: false })

const ICONS = {
    pass: markRaw(CheckCircleIcon),
    fail: markRaw(XCircleIcon),
    optional: markRaw(MinusCircleIcon),
    extra: markRaw(InformationCircleIcon)
}

const columns = [
    { label: '', key: 'icon', class: ['w-10'] },
    { label: 'Field', key: 'path' },
    { label: 'Type', key: 'type' },
    { label: 'Message has', key: 'value' },
    { label: 'Result', key: 'result' }
]

const route = useRoute()
const router = useRouter()
const schemasStore = useDataFarmSchemasStore()
const { activeSchema: schema, activeDraft: draft, activeLatestPublished: latestPublished } = storeToRefs(schemasStore)

// The older version the page was asked to check against. The draft and the latest published version are always
// on offer; this one stays on offer too after another target is picked, so it can be gone back to.
const openedFor = ref<string>()
watch(() => route.query.against as string | undefined, (asked) => {
    if (asked && asked !== 'draft' && asked !== latestPublished.value?.version) openedFor.value = asked
}, { immediate: true })

const targets = computed(() => {
    const list: { title: string, value: string }[] = []
    if (draft.value) list.push({ title: 'Draft', value: 'draft' })
    if (latestPublished.value?.version) list.push({ title: `Published ${latestPublished.value.version}`, value: latestPublished.value.version })
    const known = schema.value?.versions.some(entry => entry.version === openedFor.value)
    if (openedFor.value && known && !list.some(target => target.value === openedFor.value)) list.push({ title: openedFor.value, value: openedFor.value })
    return list
})
// The draft is what is being worked on, so it is checked unless a version was asked for
const against = computed(() => {
    const asked = route.query.against as string | undefined
    return targets.value.find(target => target.value === asked)?.value ?? targets.value[0]?.value
})
function pick (value: string) {
    router.replace({ query: { ...route.query, against: value } })
}

const document = ref<Record<string, unknown> | null>(null)
watch([() => schema.value?.id, against, () => draft.value?.schema, () => latestPublished.value], async ([schemaId, target]) => {
    document.value = null
    if (!schemaId || !target) return
    if (target === 'draft') {
        document.value = draft.value?.schema ?? null
    } else if (target === latestPublished.value?.version) {
        document.value = latestPublished.value.schema ?? null
    } else {
        try {
            const version = await schemasStore.fetchVersion(target)
            if (against.value === target) document.value = version.schema ?? null
        } catch (err) {
            Alerts.emit(err.response?.data?.error || `Failed to load version ${target}.`, 'warning')
        }
    }
}, { immediate: true })

const payloadText = ref('')
const parsed = computed<{ value?: unknown, error?: string }>(() => {
    if (!payloadText.value.trim()) return {}
    try {
        return { value: JSON.parse(payloadText.value) }
    } catch (err) {
        return { error: err.message }
    }
})

// What was checked comes with the answer, and an answer to an older check is dropped
const result = ref<{ valid: boolean, errors: ValidationError[], payload: unknown, document: Record<string, unknown> } | null>(null)
const checkFailed = ref('')
let checkToken = 0

const check = debounce(async (token: number, payload: unknown, target: string, checkedDocument: Record<string, unknown>) => {
    if (token !== checkToken) {
        return
    }
    try {
        const answer = await schemasStore.validateMessage(target, payload)
        if (token === checkToken) {
            result.value = { ...answer, payload, document: checkedDocument }
        }
    } catch (err) {
        if (token === checkToken) {
            checkFailed.value = err.response?.data?.error || 'Failed to check the message.'
        }
    }
}, 300)

watch([parsed, against, document], ([message, target, checkedDocument]) => {
    checkToken++
    result.value = null
    checkFailed.value = ''
    if (!('value' in message) || !target || !checkedDocument) return
    check(checkToken, message.value, target, checkedDocument)
})

const rows = computed<ValidationRow[]>(() => result.value ? validationRows(result.value.document, result.value.payload, result.value.errors) : [])
const problems = computed(() => rows.value.filter(row => row.result === 'fail').length)

const hint = computed(() => {
    if (parsed.value.error) return ''
    if (!payloadText.value.trim()) {
        return 'Paste a message on the right to see how each field lines up with the schema.'
    }
    if (result.value) {
        return 'The schema lists no fields, and the message has none to show.'
    }
    return checkFailed.value ? '' : 'Checking the message...'
})

const banner = computed(() => {
    if (parsed.value.error) return { kind: 'fail', icon: XCircleIcon, text: `The message is not valid JSON: ${parsed.value.error}` }
    if (checkFailed.value) return { kind: 'fail', icon: XCircleIcon, text: checkFailed.value }
    if (!result.value) return null
    if (result.value.valid) return { kind: 'pass', icon: CheckCircleIcon, text: 'Passes' }
    const count = problems.value || result.value.errors.length
    return { kind: 'fail', icon: XCircleIcon, text: `Fails · ${count} ${count === 1 ? 'problem' : 'problems'}` }
})

function fillExample () {
    payloadText.value = JSON.stringify(exampleFromSchema(document.value!), null, 2)
}
</script>

<style scoped lang="scss">
.schema-validate {
    &__intro,
    &__label {
        margin: 0;
        color: var(--ff-color-text-subtle);
    }

    &__empty {
        margin: 0;
        font-size: 0.875rem;
        color: var(--ff-color-text-subtle);
    }

    &__banner {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 12px 16px;
        border: 1px solid;
        border-radius: 0.625rem;
        font-weight: 600;
        font-size: 0.875rem;

        .ff-icon {
            margin-left: 0;
        }

        &--pass {
            color: var(--ff-color-status-success-text);
            background: var(--ff-color-status-success-bg);
            border-color: var(--ff-color-status-success-border);
        }

        &--fail {
            color: var(--ff-color-status-error-text);
            background: var(--ff-color-status-error-bg);
            border-color: var(--ff-color-status-error-border);
        }
    }

    &__body {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 1rem;
    }

    &__results {
        flex: 1 1 40rem;
        min-width: 0;
    }

    &__payload {
        flex: 0 1 30rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    &__payload-label {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--ff-color-text);
    }

    &__payload-help {
        margin: 0;
        font-size: 0.75rem;
        color: var(--ff-color-text-subtle);
    }

    &__textarea {
        width: 100%;
        font-family: monospace;
        font-size: 0.8125rem;
        // a bare textarea has no background of its own and would take the page's: this is the one the platform's inputs have
        background-color: var(--ff-color-bg-app);
    }

    &__icon-cell {
        width: 2.5rem;
    }

    &__icon {
        &--pass { color: var(--ff-color-status-success-text); }
        &--fail { color: var(--ff-color-status-error-text); }
        &--optional { color: var(--ff-color-text-subtle); }
        &--extra { color: var(--ff-color-link); }
    }

    &__result {
        &--pass { color: var(--ff-color-status-success-text); }
        &--fail { color: var(--ff-color-status-error-text); }
        &--optional { color: var(--ff-color-text-subtle); }
        &--extra { color: var(--ff-color-link); }
    }

    &__muted {
        color: var(--ff-color-text-subtle);
    }

    // lets the cell shrink below its content, so a long value is cut short instead of widening the table
    &__value-cell {
        max-width: 12rem;
    }

    &__value {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>
