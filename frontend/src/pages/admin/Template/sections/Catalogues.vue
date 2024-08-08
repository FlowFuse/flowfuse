<template>
    <div>
        <FormHeading>
            Node Catalogues
            <ChangeIndicator class="!inline-block ml-4 mt-0" :value="editable.changed.settings.palette_catalogue" />
        </FormHeading>

        <FeatureUnavailable v-if="!isCustomCatalogsFeatureEnabled" :minimal="true" class="!my-5 !mx-0 !p-0 !justify-start" />

        <form class="space-y-4 max-w-2xl" @submit.prevent>
            <div v-if="!projectLauncherCompatible" class="text-red-400 space-y-1">
                <p>You will need to update your Instance Node-RED Version to use this feature.</p>
                <div v-if="project.stack.replacedBy">
                    <ff-button size="small" to="./settings/danger?highlight=updateStack">Update</ff-button>
                </div>
            </div>

            <div v-else>
                <div class="flex flex-col sm:flex-row" />
                <div class="w-full flex flex-col sm:flex-row">
                    <div class="w-full sm:mr-8 space-y-2">
                        <div class="w-full flex items-center">
                            <div class="flex-grow" :class="{'opacity-20': !defaultEnabled}">{{ defaultCatalogue }}</div>
                            <!-- Default is enabled, allow for removal -->
                            <ff-button
                                v-if="!defaultEnabled"
                                v-ff-tooltip:left="'Restore Default Catalogue'"
                                kind="tertiary" size="small"
                                :disabled="isDisabled"
                                @click="addDefault()"
                            >
                                <template #icon><UndoIcon /></template>
                            </ff-button>
                            <!-- Default is disabled, allow for restoration -->
                            <ff-button
                                v-else
                                kind="tertiary"
                                size="small"
                                :disabled="isDisabled"
                                @click="removeURL(defaultCatalogue)"
                            >
                                <template #icon><XIcon /></template>
                            </ff-button>
                        </div>
                        <div v-for="(url, index) in thirdPartyUrls" :key="index" class="w-full flex items-center">
                            <div class="flex-grow">{{ url }}</div>
                            <ff-button
                                kind="tertiary"
                                size="small"
                                :disabled="isDisabled"
                                @click="removeURL(url)"
                            >
                                <template #icon><XIcon /></template>
                            </ff-button>
                        </div>
                        <FormRow
                            v-model="input.url"
                            class="w-full sm:mr-8"
                            :error="input.error"
                            :disabled="isDisabled"
                            containerClass="none"
                            appendClass="ml-2 relative"
                        >
                            <template #append>
                                <ff-button
                                    kind="secondary"
                                    size="small"
                                    :disabled="isDisabled" @click="addURL()"
                                >
                                    <template #icon>
                                        <PlusSmIcon />
                                    </template>
                                </ff-button>
                            </template>
                        </FormRow>
                    </div>
                    <div class="max-w-sm w-24">
                        <LockSetting
                            v-model="editable.policy.palette_catalogue"
                            :editTemplate="editTemplate"
                            :changed="editable.changed.policy.palette_catalogue"
                        />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>

<script>
import { PlusSmIcon, XIcon } from '@heroicons/vue/outline'

import SemVer from 'semver'

import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import FeatureUnavailable from '../../../../components/banners/FeatureUnavailable.vue'
import UndoIcon from '../../../../components/icons/Undo.js'
import featuresMixin from '../../../../mixins/Features.js'
import ChangeIndicator from '../components/ChangeIndicator.vue'
import LockSetting from '../components/LockSetting.vue'

export default {
    name: 'TemplateCatalogueEditor',
    components: {
        FeatureUnavailable,
        FormRow,
        FormHeading,
        ChangeIndicator,
        LockSetting,
        PlusSmIcon,
        XIcon,
        UndoIcon
    },
    mixins: [featuresMixin],
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
            defaultCatalogue: 'https://catalogue.nodered.org/catalogue.json',
            showAddRow: false,
            input: {
                url: '',
                error: ''
            }
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
        urls () {
            return this.editable.settings.palette_catalogue
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
            return SemVer.satisfies(SemVer.coerce(launcherVersion), '>=1.11.3')
        },
        addDefaultEnabled () {
            if (this.readOnly) {
                return true
            } else {
                return this.urls.includes(this.defaultCatalogue)
            }
        },
        defaultEnabled () {
            // whether or not this Template has the default catalogue enabled
            return this.urls.includes(this.defaultCatalogue)
        },
        thirdPartyUrls () {
            // whether or not this Template has any third party catalogues enabled
            return this.urls.filter(url => url !== this.defaultCatalogue)
        },
        isDisabled () {
            if (!this.isCustomCatalogsFeatureEnabled) {
                return true
            } else return this.readOnly
        }
    },
    methods: {
        addURL () {
            const newURL = this.input.url.trim()
            if (newURL) {
                try {
                    // eslint-disable-next-line no-new
                    new URL(newURL)
                } catch (err) {
                    this.input.error = 'Invalid URL'
                    return
                }
                if (!this.editable.settings.palette_catalogue.includes(newURL)) {
                    this.editable.settings.palette_catalogue.push(newURL)
                    this.input.url = ''
                    this.input.error = ''
                } else {
                    this.input.error = 'Catalogue already present'
                }
            }
        },
        removeURL (url) {
            const index = this.editable.settings.palette_catalogue.indexOf(url)
            this.editable.settings.palette_catalogue.splice(index, 1)
        },
        addDefault () {
            const defaultCatalogue = 'https://catalogue.nodered.org/catalogue.json'
            if (this.editable.settings.palette_catalogue.indexOf(defaultCatalogue)) {
                this.editable.settings.palette_catalogue.unshift(defaultCatalogue)
            }
        }
    }
}
</script>

<style lang="scss">
input:disabled {
  background-color: $ff-white !important;
  opacity: .9;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}
</style>
