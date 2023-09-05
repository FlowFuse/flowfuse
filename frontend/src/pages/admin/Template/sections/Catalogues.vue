<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading>
            Node Catalogues
        </FormHeading>

        <div v-if="!projectLauncherCompatible" class="text-red-400 space-y-1">
            <p>You will need to update your Project Stack to use this feature.</p>
            <div v-if="project.stack.replacedBy">
                <ff-button size="small" to="./settings/danger">Update</ff-button>
            </div>
        </div>

        <div v-else>
            <div class="flex flex-col sm:flex-row">
                <ChangeIndicator :value="editable.changed.settings.palette_catalogue" />
            </div>
            <div class="flex flex-col sm:flex-row">
                <table class="w-full max-w-md sm:mr-8">
                    <tbody>
                        <tr v-for="(url, index) in editable.settings.palette_catalogue" :key="index">
                            <td class="px-2 align-top">
                                {{ url }}
                            </td>
                            <td>
                                <ff-button kind="tertiary" size="small" @click="removeURL(index)">
                                    <template #icon>
                                        <XIcon />
                                    </template>
                                </ff-button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="max-w-sm w-24">
                    <LockSetting v-model="editable.policy.palette_catalogue" :editTemplate="editTemplate" :changed="editable.changed.policy.palette_catalogue" />
                </div>
            </div>
            <div class="flex flex-col sm:flex-row">
                <FormRow v-model="input.url" class="w-full max-w-md sm:mr-8" :error="input.error" :disabled="readOnly">
                    <template #append>
                        <ff-button kind="secondary" size="small" @click="addURL()">
                            <template #icon>
                                <PlusSmIcon />
                            </template>
                        </ff-button>
                    </template>
                </FormRow>
            </div>
            <ff-button size="small" @click="addDefault()">
                Add Default
                <template #icon>
                    <PlusSmIcon />
                </template>
            </ff-button>
        </div>
    </form>
</template>

<script>
import { PlusSmIcon, XIcon } from '@heroicons/vue/outline'

import SemVer from 'semver'

import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import ChangeIndicator from '../components/ChangeIndicator.vue'
import LockSetting from '../components/LockSetting.vue'

export default {
    name: 'TemplateCatalogueEditor',
    components: {
        FormRow,
        FormHeading,
        ChangeIndicator,
        LockSetting,
        PlusSmIcon,
        XIcon
    },
    props: {
        editTemplate: {
            type: Boolean,
            default: false
        },
        modelValue: {
            type: Object,
            required: true
        },
        readOnly: {
            type: Boolean,
            default: false
        },
        project: {
            type: Object,
            required: false,
            default: null
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
            showAddRow: false,
            input: {
                url: '',
                error: ''
            },
            urls: []
        }
    },
    computed: {
        editable: {
            get () {
                return this.modelValue
            },
            set (localValue) {
                this.$emit('update:modelValue', localValue)
            }
        },
        projectLauncherCompatible () {
            if (this.editTemplate) {
                // When editing template we don't have a project
                return true
            }

            const launcherVersion = this.project?.meta?.versions?.launcher
            if (!launcherVersion) {
                // We won't have this for a suspended project - so err on the side
                // of permissive
                return true
            }
            // TODO needs to semver >= 1.12.0
            return SemVer.satisfies(launcherVersion, '>=1.11.0')
        }
    },
    watch: {
        'editable.settings.palette_catalogue': {
            deep: true,
            handler (v) {
                this.urls = v
            }
        }
    },
    methods: {
        addURL () {
            const newURL = this.input.url.trim()
            if (newURL) {
                try {
                    // eslint-disable-next-line
                    const u = new URL(newURL)
                } catch (err) {
                    this.input.error = 'Invalid URL'
                    return
                }
                this.editable.settings.palette_catalogue.push(newURL)
                this.input.url = ''
                this.input.error = ''
            }
        },
        removeURL (index) {
            this.editable.settings.palette_catalogue.splice(index, 1)
        },
        addDefault () {
            if (this.editable.settings.palette_catalogue.indexOf('https://catalogue.nodered.org/catalogue.json')) {
                this.editable.settings.palette_catalogue.unshift('https://catalogue.nodered.org/catalogue.json')
            }
        }
    }
}
</script>
