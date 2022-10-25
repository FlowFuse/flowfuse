<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading>
            <div class="flex">
                <div class="mr-4">Installed Modules</div>
                <div class="flex justify-center"><ChangeIndicator :value="editable.changed.palette_modules"></ChangeIndicator></div>
            </div>
        </FormHeading>

        <div class="text-red-400 space-y-1" v-if="!projectLauncherCompatible">
            <p>You will need to update your Project Stack to use this feature.</p>
            <div v-if="project.stack.replacedBy">
                <ff-button size="small" to="./settings/danger">Update</ff-button>
            </div>
        </div>
        <div class="text-gray-400 space-y-1">
            <p>This is the list of modules that will be installed into the project.</p>
            <div v-if="editable.settings.palette_allowInstall" class="space-y-1">
                <p>Any changes to this list will require restarting the project to apply.</p>
                <p>You can also install modules using the palette manager in the editor.</p>
            </div>
        </div>

        <table class="w-full max-w-2xl table-fixed text-sm rounded overflow-hidden">
            <thead>
                <tr class="font-medium">
                    <td class="border bg-gray-100 p-2 w-auto">Module</td>
                    <td class="border bg-gray-100 p-2 w-48">Version</td>
                    <td class="border bg-gray-100 p-2 w-24"></td>
                </tr>
            </thead>
            <tbody class="bg-white">
                <tr v-for="(item, itemIdx) in editable.settings.palette_modules"  :key="item.index">
                    <td class="px-2 py-2 border align-top">
                        <FormRow
                            class="font-mono"
                            v-model="item.name"
                            :error="item.error"
                            type="uneditable">
                        </FormRow>
                        <!-- <ff-text-input  v-model="item.name" :disabled="item.encrypted"  /> -->
                    </td>
                    <td class="px-2 py-2 border align-top">
                        <div style="width: calc(100% - 40px);">
                            <FormRow
                                class="font-mono"
                                v-model="item.version"
                                :type="(!readOnly && item.local && item.editing)?'text':'uneditable'"
                                :error="item.errorVersion">
                                <template #append>
                                    <div v-if="!readOnly && item.local && !item.editing" class="flex items-center">
                                        <ff-button kind="tertiary" @click="editModule(itemIdx)" size="small">
                                            <template v-slot:icon>
                                                <PencilIcon />
                                            </template>
                                        </ff-button>
                                    </div>
                                    <div v-if="!readOnly && item.local && item.editing" class="flex items-center pt-1">
                                        <ff-button kind="tertiary" @click="cancelEditModule(itemIdx)" size="small">
                                            <template v-slot:icon>
                                                <XIcon />
                                            </template>
                                        </ff-button>
                                    </div>
                                </template>
                            </FormRow>
                        </div>
                    </td>
                    <td class="border align-middle px-2">
                        <div v-if="!readOnly && item.local" class="flex justify-center">
                            <ff-button kind="tertiary" @click="removeModule(itemIdx)" size="small">
                                <template v-slot:icon>
                                    <TrashIcon />
                                </template>
                            </ff-button>
                        </div>
                        <div v-else-if="!item.local" class="flex justify-center">
                            <LockClosedIcon class="inline w-4" />
                        </div>
                    </td>
                </tr>
                <tr v-if="editable.settings.palette_modules?.length === 0">
                    <td class="px-4 py-4 border w-auto align-top text-center text-gray-400" colspan="3">
                        No modules installed
                    </td>
                </tr>
                <!-- Empty row to differentiate between the existing env vars, and the iput form row-->
                <tr v-if="!readOnly">
                    <td colspan="3" class="p-1 bg-gray-50"></td>
                </tr>
                <tr v-if="!readOnly && !showAddRow" class="">
                    <td colspan="3" class="p-1 bg-gray-50">
                        <ff-button kind="primary" @click="showAddModule()" size="small">
                            Add module
                            <template v-slot:icon>
                                <PlusSmIcon />
                            </template>
                        </ff-button>
                    </td>
                </tr>
                <tr v-if="!readOnly && showAddRow" class="">
                    <td class="px-4 pt-4 border w-auto align-top">
                        <FormRow class="font-mono" v-model="input.name" :error="input.error" placeholder="@example/module">
                            <template #description>npm module name</template>
                        </FormRow>
                    </td>
                    <td class="px-4 pt-4 pb-3 border w-auto align-top space-y-3">
                        <FormRow class="font-mono" v-model="input.version" :error="input.errorVersion" placeholder="*">
                            <template #description>*, 1.2.3, ^2.3.2, ...</template>
                        </FormRow>
                        <!-- <FormRow id="encrypt-env-var" v-model="input.encrypt" type="checkbox"> <span class="text-gray-500"><LockClosedIcon class="inline w-4" /> encrypt</span></FormRow> -->
                    </td>
                    <td class="border w-16">
                        <div class="flex align-center justify-center space-x-2">
                            <ff-button kind="primary" @click="addModule()" :disabled="!addEnabled" size="small">
                                <template v-slot:icon>
                                    <CheckIcon />
                                </template>
                            </ff-button>
                            <ff-button kind="secondary" @click="cancelAddModule()" size="small">
                                <template v-slot:icon>
                                    <XIcon />
                                </template>
                            </ff-button>
                        </div>
                    </td>
                    <td class="p-2" v-if="editTemplate"></td>
                </tr>
            </tbody>
        </table>
    </form>

</template>

<script>

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import ChangeIndicator from '../components/ChangeIndicator'
import { TrashIcon, PlusSmIcon, LockClosedIcon, PencilIcon, XIcon, CheckIcon } from '@heroicons/vue/outline'

export default {
    name: 'TemplatePaletteModulesEditor',
    props: ['editTemplate', 'modelValue', 'readOnly', 'project'],
    emits: ['update:modelValue'],
    data () {
        return {
            addedCount: 0,
            input: {
                name: '',
                version: ''
            },
            showAddRow: false,
            modules: {}
        }
    },
    computed: {
        editable: {
            get () { return this.modelValue },
            set (localValue) { this.$emit('update:modelValue', localValue) }
        },
        projectLauncherCompatible () {
            const launcherVersion = this.project?.meta?.versions?.launcher
            if (!launcherVersion) {
                // We won't have this for a suspended project - so err on the side
                // of permissive
                return true
            }
            return !/^0\./.test(launcherVersion)
        },
        addEnabled () {
            return this.input.name && this.input.version && !this.input.error && !this.input.errorVersion
        }
    },
    watch: {
        'input.name' () {
            if (this.input.name !== '' && !this.validateModuleName(this.input.name)) {
                this.input.error = 'Invalid name'
            } else if (this.modules[this.input.name] !== undefined) {
                this.input.error = 'Duplicate name'
            } else {
                this.input.error = ''
            }
        },
        'input.version' () {
            if (this.input.version !== '' && !this.validateModuleVersion(this.input.version)) {
                this.input.errorVersion = 'Invalid version'
            } else {
                this.input.errorVersion = ''
            }
        },
        'editable' () {
            if (this.editable) {
                this.editable.settings.palette_modules?.forEach(field => {
                    this.modules[field.name] = field
                })
            }
        },
        'editable.settings.palette_modules': {
            deep: true,
            handler (v) {
                if (v) {
                    this.modules = {}
                    v.forEach((field, i) => {
                        if (this.modules[field.name] === undefined) {
                            this.modules[field.name] = i
                        }
                        if (field.policy === undefined && this.modules[field.name] !== i) {
                            field.error = 'Field has duplicate name'
                        } else if (!this.validateModuleName(field.name)) {
                            field.error = 'Invalid name'
                        } else {
                            field.error = ''
                        }
                        if (!this.validateModuleVersion(field.version)) {
                            field.errorVersion = 'Invalid version'
                        } else {
                            field.errorVersion = ''
                        }
                    })
                }
            }
        }
    },
    methods: {
        validateModuleName (name) {
            const BUILT_IN_MODULES = [
                '@flowforge/nr-project-nodes'
            ]
            return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name) && !BUILT_IN_MODULES.includes(name)
        },
        validateModuleVersion (version) {
            return /^\*$|x|(?:[\^~]?(0|[1-9]\d*)\.(x$|0|[1-9]\d*)(?:\.(x$|0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)?)$/.test(version)
        },
        showAddModule () {
            this.input.name = ''
            this.input.version = ''
            this.showAddRow = true
        },
        cancelAddModule () {
            this.showAddRow = false
        },
        editModule (index) {
            const module = this.editable.settings.palette_modules[index]
            module.originalVersion = module.version
            module.editing = true
        },
        cancelEditModule (index) {
            const module = this.editable.settings.palette_modules[index]
            module.version = module.originalVersion
            module.editing = false
        },
        removeModule (index) {
            const field = this.editable.settings.palette_modules[index]
            delete this.modules[field.name]
            this.editable.settings.palette_modules.splice(index, 1)
        },
        addModule (index) {
            const field = {
                index: 'add-' + this.addedCount++,
                name: this.input.name,
                version: this.input.version,
                local: true
            }
            this.modules[this.input.name] = this.editable.settings.palette_modules.length
            this.input.name = ''
            this.input.version = ''
            this.editable.settings.palette_modules.push(field)
            this.showAddRow = false
        }
    },
    components: {
        FormRow,
        FormHeading,
        ChangeIndicator,
        TrashIcon,
        PencilIcon,
        PlusSmIcon,
        LockClosedIcon,
        XIcon,
        CheckIcon
    }
}
</script>
