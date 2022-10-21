<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading>
            <div class="flex">
                <div class="mr-4">Environment Variables</div>
                <div class="flex justify-center"><ChangeIndicator :value="editable.changed.env"></ChangeIndicator></div>
            </div>
        </FormHeading>
        <table class="w-full max-w-4xl table-fixed text-sm rounded overflow-hidden">
            <thead>
                <tr class="font-medium">
                    <td class="border bg-gray-100 p-2 w-auto">Name</td>
                    <td class="border bg-gray-100 p-2 w-auto">Value</td>
                    <td class="border bg-gray-100 p-2 w-16"></td>
                    <td class="p-2 w-32" v-if="editTemplate"></td>
                </tr>
            </thead>
            <tbody class="bg-white">
                <tr v-for="(item, itemIdx) in editable.settings.env"  :key="item.index">
                    <td class="px-4 py-4 border w-auto align-top">
                        <FormRow
                            class="font-mono"
                            v-model="item.name"
                            :error="item.error"
                            :disabled="item.encrypted"
                            value-empty-text=""
                            :type="(!readOnly && (editTemplate || item.policy === undefined))?'text':'uneditable'"></FormRow>
                        <!-- <ff-text-input  v-model="item.name" :disabled="item.encrypted"  /> -->
                    </td>
                    <td class="px-4 py-4 border w-auto align-top" :class="{'align-middle':item.encrypted}">
                        <div class="w-full" v-if="!item.encrypted">
                            <FormRow
                                class="font-mono"
                                v-model="item.value"
                                value-empty-text=""
                                :type="(!readOnly && (editTemplate || item.policy === undefined || item.policy))?'text':'uneditable'"></FormRow>
                        </div>
                        <div v-else class="pt-1 text-gray-400"><LockClosedIcon class="inline w-4" /> encrypted</div>
                    </td>
                    <td class="border w-16 align-middle">
                        <div v-if="(!readOnly && (editTemplate|| item.policy === undefined))" class="flex justify-center ">
                            <ff-button kind="tertiary" @click="removeEnv(itemIdx)" size="small">
                                <template v-slot:icon>
                                    <TrashIcon />
                                </template>
                            </ff-button>
                        </div>
                        <div v-else-if="(item.platform === true)" class="flex justify-center ">
                            <LockClosedIcon class="inline w-4" />
                        </div>
                    </td>
                    <td v-if="!readOnly && editTemplate" class="px-4 py-4 align-middle">
                        <LockSetting :editTemplate="editTemplate" v-model="item.policy"></LockSetting>
                    </td>
                </tr>
                <tr v-if="editable.settings.env?.length === 0">
                    <td class="px-4 py-4 border w-auto align-top text-center text-gray-400" colspan="3">
                        No Environment Variables Defined
                    </td>
                </tr>
                <!-- Empty row to differentiate between the existing env vars, and the iput form row-->
                <tr v-if="!readOnly">
                    <td :colspan="editTemplate?4:3" class="p-4 bg-gray-50"></td>
                </tr>
                <tr v-if="!readOnly" class="">
                    <td class="px-4 pt-4 border w-auto align-top">
                        <FormRow class="font-mono" v-model="input.name" :error="input.error" placeholder="Name"></FormRow>
                    </td>
                    <td class="px-4 pt-4 pb-3 border w-auto align-top space-y-3">
                        <FormRow class="font-mono" v-model="input.value" placeholder="Value"></FormRow>
                        <!-- <FormRow id="encrypt-env-var" v-model="input.encrypt" type="checkbox"> <span class="text-gray-500"><LockClosedIcon class="inline w-4" /> encrypt</span></FormRow> -->
                    </td>
                    <td class="border w-16">
                        <div class="flex align-center justify-center">
                            <ff-button kind="primary" @click="addEnv()" :disabled="!addEnabled" size="small">
                                <template v-slot:icon>
                                    <PlusSmIcon />
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
import LockSetting from '../components/LockSetting'
import ChangeIndicator from '../components/ChangeIndicator'
import { TrashIcon, PlusSmIcon, LockClosedIcon } from '@heroicons/vue/outline'

export default {
    name: 'TemplateEnvironmentEditor',
    props: ['editTemplate', 'modelValue', 'readOnly'],
    emits: ['update:modelValue'],
    data () {
        return {
            addedCount: 0,
            input: {},
            envVarNames: {}
        }
    },
    computed: {
        editable: {
            get () { return this.modelValue },
            set (localValue) { this.$emit('update:modelValue', localValue) }
        },
        addEnabled () {
            return this.input.name && this.input.value !== undefined && !this.input.error
        }
    },
    watch: {
        'input.name' () {
            if (/ /.test(this.input.name)) {
                this.input.error = 'Invalid name'
            } else if (this.input.name.startsWith('FF_')) {
                this.input.error = 'Reserved name'
            } else if (this.envVarNames[this.input.name] !== undefined) {
                this.input.error = 'Duplicate name'
            } else {
                this.input.error = ''
            }
        },
        'editable' () {
            if (this.editable) {
                this.editable.settings.env.forEach(field => {
                    this.envVarNames[field.name] = field
                })
            }
        },
        'editable.settings.env': {
            deep: true,
            handler (v) {
                this.envVarNames = {}
                v.forEach((field, i) => {
                    if (this.envVarNames[field.name] === undefined) {
                        this.envVarNames[field.name] = i
                    }
                    if (field.policy === undefined && field.platform === true) {
                        field.policy = false
                    }
                    if (field.policy === undefined && this.envVarNames[field.name] !== i) {
                        field.error = 'Field has duplicate name'
                    } else if (/ /.test(field.name)) {
                        field.error = 'Invalid name'
                    } else {
                        field.error = ''
                    }
                })
            }
        }
    },
    methods: {
        addEnv () {
            const field = {
                index: 'add-' + this.addedCount++,
                name: this.input.name,
                value: this.input.value,
                encrypted: this.input.encrypt,
                policy: this.editTemplate ? false : undefined
            }
            this.envVarNames[field.name] = this.editable.settings.env.length
            this.editable.settings.env.push(field)
            this.input.name = ''
            this.input.encrypt = false
            this.input.value = ''
        },
        removeEnv (index) {
            const field = this.editable.settings.env[index]
            delete this.envVarNames[field.name]
            this.editable.settings.env.splice(index, 1)
        }
    },
    mounted () {
        this.editable.settings.env.forEach(field => {
            this.envVarNames[field.name] = field
        })
    },
    components: {
        FormRow,
        FormHeading,
        LockSetting,
        ChangeIndicator,
        TrashIcon,
        PlusSmIcon,
        LockClosedIcon
    }
}
</script>
