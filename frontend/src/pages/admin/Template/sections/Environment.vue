<template>
    <form class="space-y-4 ff-environment" @submit.prevent>
        <FormHeading>
            <div class="flex">
                <div class="mr-4">Environment Variables</div>
                <div v-if="hasInfoDialog" class="flex justify-center mr-4"><InformationCircleIcon class="w-5 cursor-pointer hover:text-blue-700" @click="openInfoDialog()" /></div>
                <div class="flex justify-center"><ChangeIndicator :value="editable.changed.env" /></div>
            </div>
        </FormHeading>
        <ff-dialog v-if="hasInfoDialog" ref="help-dialog" class="ff-dialog-box--info" :header="helpHeader || 'FlowFuse Info'">
            <template #default>
                <div class="flex gap-8">
                    <slot name="pictogram"><img src="../../../../images/pictograms/snapshot_red.png"></slot>
                    <div><slot name="helptext" /></div>
                </div>
            </template>
            <template #actions>
                <ff-button @click="$refs['help-dialog'].close()">Close</ff-button>
            </template>
        </ff-dialog>
        <div class="min-w-min">
            <!-- NOTE:  `:columns:[,,,]` is necessary to instruct the empty row to apply a col-span of 4 -->
            <ff-data-table
                v-model:search="search"
                class="w-full max-w-5xl text-sm"
                :show-search="true"
                search-placeholder="Search environment variables..."
                :columns="editTemplate ? [,,,,] : [,,,]"
                :noDataMessage="noDataMessage"
                data-el="env-vars-table"
            >
                <template #actions>
                    <template v-if="!readOnly">
                        <input id="fileUpload" ref="fileUpload" type="file" accept=".env, text/plain, *" class="hidden" hidden>
                        <ff-button kind="secondary" @click="importEnv">
                            <template #icon><DocumentDownloadIcon /></template>
                            <span class="hidden sm:flex pl-1">Import .env</span>
                        </ff-button>
                        <ff-button kind="primary" accesskey="a" data-el="add-variable" @click="addVarHandler">
                            <template #icon><PlusSmIcon /></template>
                            <span class="hidden sm:flex pl-1">Add variable</span>
                        </ff-button>
                    </template>
                </template>
                <template #header>
                    <ff-data-table-row class="font-medium">
                        <td class="ff-data-table--cell max-w-sm">Name</td>
                        <td class="ff-data-table--cell">Value</td>
                        <td class="ff-data-table--cell bg-gray-100 p-2 w-16" />
                        <td v-if="editTemplate" class="ff-data-table--cell p-2 w-32" />
                    </ff-data-table-row>
                </template>
                <template #rows>
                    <ff-data-table-row v-for="(item) in filteredRows" :key="item.index" :data-row="'row-' + item.name">
                        <td class="ff-data-table--cell !pl-1 !pr-0 !py-1 border min-w-max max-w-sm align-top">
                            <FormRow
                                v-model="item.name"
                                v-ff-tooltip:left="'Cannot be renamed'"
                                class="font-mono"
                                :containerClass="'w-full' + (!readOnly && (editTemplate || item.policy === undefined)) ? ' env-cell-uneditable':''"
                                :inputClass="item.deprecated ? 'w-full text-yellow-700 italic' : 'w-full'"
                                :error="errors[item.index] ? errors[item.index].error : null"
                                :disabled="isDisabledName(item)"
                                value-empty-text=""
                                data-el="var-name"
                                :type="(!readOnly && (editTemplate || item.policy === undefined)) ? 'text' : 'uneditable'"
                            />
                        </td>
                        <td class="ff-data-table--cell !p-1 border w-3/5 max-w-xl" :class="{'align-middle':item.encrypted, 'align-top': !item.hidden}">
                            <div v-if="!item.encrypted" class="w-full">
                                <template v-if="(!readOnly && (editTemplate || item.policy === undefined || item.policy))">
                                    <textarea
                                        v-model="item.value"
                                        :placeholder="item.hidden ? 'Value hidden' : ''"
                                        data-el="var-value"
                                        :class="'w-full font-mono max-h-40' + ((item.value && item.value.split('\n').length > 1) ? ' h-20' : ' h-8') + (item.deprecated ? ' text-yellow-700 italic' : '')"
                                    />
                                </template>
                                <template v-else>
                                    <span v-if="item.hidden" class="italic text-gray-300">Value hidden</span>
                                    <FormRow
                                        v-else
                                        v-model="item.value"
                                        class="font-mono"
                                        containerClass="w-full env-cell-uneditable"
                                        :inputClass="item.deprecated ? 'text-yellow-700 italic' : ''"
                                        data-el="var-value"
                                        value-empty-text=""
                                        :type="'uneditable'"
                                    />
                                </template>
                            </div>
                            <div v-else class="pt-1 text-gray-400"><LockClosedIcon class="inline w-4" /> encrypted</div>
                        </td>
                        <td class="ff-data-table--cell !p-1 border w-16 align-top">
                            <div v-if="(!readOnly && (editTemplate|| item.policy === undefined))" class="flex justify-center mt-1 items-center gap-3">
                                <ff-button kind="tertiary" size="small" data-el="remove" @click="removeEnv(item.index)">
                                    <template #icon>
                                        <TrashIcon />
                                    </template>
                                </ff-button>
                                <template v-if="typeof item.index === 'string' && item.index.startsWith('add-')">
                                    <ff-button
                                        v-ff-tooltip:left="'Setting visibility to hidden will lock the variable name and make the value hidden. To revert, you\'ll need to delete and recreate the variable.'"
                                        kind="tertiary"
                                        size="small"
                                        data-el="visibility"
                                        @click="setEnvHidden(item.index)"
                                    >
                                        <template #icon>
                                            <EyeOffIcon v-if="item.hidden" />
                                            <EyeIcon v-else />
                                        </template>
                                    </ff-button>
                                </template>
                                <template v-else>
                                    <span
                                        v-if="!!(originalEnvVars.find(v => v.index === item.index))?.hidden"
                                        :key="item.index"
                                        v-ff-tooltip:left="'Cannot be made public again, only overwritten'"
                                        class="mx-2 disabled"
                                        data-el="visibility"
                                    >
                                        <EyeOffIcon class="ff-icon-sm color-grey" />
                                    </span>
                                    <ff-button
                                        v-else
                                        v-ff-tooltip:left="'Setting visibility to hidden will lock the variable name and make the value hidden. To revert, you\'ll need to delete and recreate the variable.'"
                                        kind="tertiary" size="small" data-el="visibility"
                                        @click="setEnvHidden(item.index)"
                                    >
                                        <template #icon>
                                            <EyeOffIcon v-if="item.hidden" />
                                            <EyeIcon v-else />
                                        </template>
                                    </ff-button>
                                </template>
                            </div>
                            <div
                                v-else-if="(item.deprecated === true)"
                                v-ff-tooltip:left="'This setting has been deprecated'"
                                class="flex justify-center mt-1"
                            >
                                <ExclamationIcon class="inline text-yellow-700 w-4" />
                            </div>
                            <div v-else-if="(item.platform === true)" class="flex justify-center mt-2">
                                <LockClosedIcon class="inline w-4" />
                            </div>
                        </td>
                        <td v-if="!readOnly && editTemplate" class="ff-data-table--cell !p-1 align-top">
                            <LockSetting v-model="item.policy" :editTemplate="editTemplate" />
                        </td>
                    </ff-data-table-row>
                </template>
            </ff-data-table>
        </div>
    </form>
</template>

<script>
import { DocumentDownloadIcon, ExclamationIcon, EyeIcon, EyeOffIcon, InformationCircleIcon, LockClosedIcon, PlusSmIcon, TrashIcon } from '@heroicons/vue/outline'

import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import Alerts from '../../../../services/alerts.js'
import ChangeIndicator from '../components/ChangeIndicator.vue'
import LockSetting from '../components/LockSetting.vue'
import { parseDotEnv } from '../utils.js'

export default {
    name: 'TemplateEnvironmentEditor',
    components: {
        FormRow,
        FormHeading,
        LockSetting,
        ChangeIndicator,
        DocumentDownloadIcon,
        TrashIcon,
        PlusSmIcon,
        LockClosedIcon,
        ExclamationIcon,
        InformationCircleIcon,
        EyeIcon,
        EyeOffIcon
    },
    props: {
        editTemplate: {
            type: Boolean,
            default: false
        },
        modelValue: {
            type: Object,
            default: () => ({ settings: { env: [] } })
        },
        readOnly: {
            type: Boolean,
            default: false
        },
        helpHeader: {
            // for the dialog that opens, e.g. "FlowFuse - Device Group Environment Variables"
            type: String,
            default: null
        },
        originalEnvVars: {
            type: Array,
            default: () => []
        }
    },
    emits: ['update:modelValue', 'validated'],
    data () {
        return {
            ogEnvVars: [],
            addedCount: 0,
            input: {},
            envVarLookup: {},
            search: '',
            pauseEnvWatch: false,
            errors: { }
        }
    },
    computed: {
        editable: {
            get () { return this.modelValue },
            set (localValue) { this.$emit('update:modelValue', localValue) }
        },
        filteredRows: function () {
            if (this.search === '') {
                return this.editable?.settings?.env?.filter(row => !row.deprecated)
            }
            const search = this.search.toLowerCase()
            return this.editable.settings.env.filter(row => {
                return !row.deprecated && (row.name.toLowerCase().includes(search) || row.value.toLowerCase().includes(search))
            })
        },
        noDataMessage: function () {
            return this.search === '' ? 'No environment variables' : 'Not found! Try a different search term.'
        },
        hasInfoDialog () {
            return !!this.$slots.helptext
        }
    },
    watch: {
        'editable' () {
            this.updateLookup()
        },
        'editable.settings.env': {
            deep: true,
            handler: 'validate'
        }
    },
    mounted () {
        this.updateLookup()
        this.validate()
        // save the original env vars
        if (!this.originalEnvVars || this.originalEnvVars.length === 0) {
            this.ogEnvVars = this.editable.settings.env
        } else {
            this.ogEnvVars = this.originalEnvVars
        }
    },
    methods: {
        openInfoDialog () {
            this.$refs['help-dialog'].show()
        },
        validate () {
            const envVars = this.editable?.settings?.env || []
            this.updateLookup()
            const counts = {}

            envVars.forEach((field, i) => {
                // set field policy
                if (field.policy === undefined && (field.platform === true || field.deprecated === true)) {
                    field.policy = false
                }
                // set field index if not present
                if (typeof field.index === 'undefined' || (typeof field.index === 'number' && field.index !== i)) {
                    field.index = i
                }

                // count the number of times each name appears
                counts[field.name] = (counts[field.name] || 0) + 1

                // clear existing errors
                this.errors[field.index] = { error: '' }
            })

            let hasErrors = false
            // second scan: check for errors & flag them
            envVars.forEach((field, i) => {
                if (field.name === '' || / /.test(field.name)) {
                    this.errors[field.index].error = 'Invalid name' // if name is empty  are empty - or - name contains spaces
                    hasErrors = true
                } else if (field.name.startsWith('FF_') && !field.platform) {
                    this.errors[field.index].error = 'Reserved name'
                    hasErrors = true
                } else if (!field.name.match(/^[a-zA-Z_]+[a-zA-Z0-9_]*$/)) {
                    this.errors[field.index].error = 'Names must start with a character'
                    hasErrors = true
                } else if (counts[field.name] > 1) {
                    this.errors[field.index].error = 'Duplicate name'
                    hasErrors = true
                }
            })
            this.$emit('validated', hasErrors)
        },
        updateLookup () {
            this.envVarLookup = {}
            if (this.editable?.settings?.env) {
                this.editable.settings.env.forEach((field, i) => {
                    this.envVarLookup[field.name] = i
                })
            }
        },
        addVarHandler () {
            this.addEnv('NEW', '', false, true)
        },
        addEnv (key, value, encrypt = false, focusNewRow = false) {
            const field = {
                index: 'add-' + this.addedCount++,
                name: key || '',
                value: value || '',
                encrypted: encrypt,
                hidden: false,
                policy: this.editTemplate ? false : undefined
            }
            this.envVarLookup[field.name] = this.editable.settings.env.length
            this.editable.settings.env.push(field)
            // focus the new row?
            if (focusNewRow) {
                this.$nextTick(() => {
                    const row = this.$el.querySelector('tr:last-child input')
                    if (row) {
                        row.focus()
                        // select the text in the input
                        row.select()
                    }
                })
            }
        },
        updateEnv (currentName, newName, value, encrypt = false) {
            const fieldIdx = this.envVarLookup[currentName]
            const field = this.editable.settings.env[fieldIdx]
            if (field) {
                delete this.envVarLookup[currentName]
                field.name = newName
                field.value = value
                field.encrypted = encrypt
                this.envVarLookup[newName] = fieldIdx
            }
        },
        removeEnv (index) {
            if (typeof index === 'string' && index.startsWith('add-')) {
                index = this.editable.settings.env.findIndex(env => env.index === index)
            } else {
                const field = this.editable.settings.env[index]
                delete this.envVarLookup[field.name]
            }

            this.editable.settings.env.splice(index, 1)
        },
        importEnv () {
            this.updateLookup()
            const fileUpload = this.$refs.fileUpload
            fileUpload.onchange = () => {
                const file = fileUpload.files[0]
                const reader = new FileReader()
                reader.onload = () => {
                    try {
                        const env = parseDotEnv(reader.result)
                        Object.keys(env).forEach(key => {
                            if (key.startsWith('FF_')) {
                                return // skip reserved names
                            }
                            if (typeof this.envVarLookup[key] !== 'undefined') {
                                const existing = this.editable.settings.env[this.envVarLookup[key]]
                                if (existing.policy === false || existing.platform === true) {
                                    return // env var is a policy locked setting or a platform var
                                }
                                this.updateEnv(existing.name, key, env[key]) // update existing
                            } else {
                                this.addEnv(key, env[key], false) // new env var
                            }
                        })
                    } catch (e) {
                        Alerts.emit('Failed to import .env file')
                    }
                }
                reader.readAsText(file)
                fileUpload.value = ''
            }
            fileUpload.click()
        },
        setEnvHidden (index) {
            let field
            const isUnsavedVar = typeof index === 'string' && index.startsWith('add-')

            if (isUnsavedVar) {
                field = this.editable.settings.env.find(env => env.index === index)
            } else {
                field = this.editable.settings.env[index]
            }

            field.hidden = !field.hidden
        },
        isDisabledName (item) {
            if (item.encrypted) return true
            const originalItem = this.originalEnvVars.find(env => env.index === item.index)
            return typeof item.index === 'number' && item.hidden && originalItem?.hidden
        }
    }
}
</script>

<style lang="scss" scoped>
.ff-data-table--cell textarea {
    resize: vertical;
    max-height: 10rem; /* 160px approx ~8 lines, after which user will need to scroll */
    /* Below styles emulate the text control in a form row */
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    /* height: 32px; */
    padding: 6px;
    min-height: 32px; /* align with item in cell-1*/
    width: 100%;
    display: flex;
    gap: 0px;
    align-items: center;
    background-color: white;
    border-color: #D1D5DB;
}
.ff-data-table--cell .env-cell-uneditable {
    max-height: 10rem; /* 160px approx ~8 lines, after which user will need to scroll */
    overflow: auto;
    white-space: pre;
    cursor: default;
}
.ff-data-table--cell .env-cell-uneditable input {
    cursor: default;
}
.ff-data-table--cell div.uneditable {
    cursor: default;
}
</style>

<style lang="scss">
.ff-environment {
    .ff-input.ff-text-input {
        input:disabled {
            color: $ff-grey-600
        }
    }
}
</style>
