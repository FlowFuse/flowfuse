<template>
    <div>
        <FormHeading>
            NPM configuration file
            <ChangeIndicator class="!inline-block ml-4 mt-0" :value="editable.changed.settings.palette_npmrc" />
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
                <div v-if="!readOnly" class="flex flex-col sm:flex-row">
                    <div class="space-y-4 w-full sm:mr-8">
                        <FormRow containerClass="none">
                            <template #input>
                                <textarea
                                    v-model="editable.settings.palette_npmrc"
                                    :disabled="!isCustomCatalogsFeatureEnabled"
                                    class="font-mono w-full"
                                    placeholder=".npmrc"
                                    rows="8"
                                />
                            </template>
                        </FormRow>
                    </div>
                    <LockSetting
                        v-model="editable.policy.palette_npmrc"
                        :editTemplate="editTemplate"
                        :changed="editable.changed.policy.palette_npmrc"
                    />
                </div>
                <div v-else class="flex flex-col sm:flex-row">
                    <div class="space-y-4 w-full sm:mr-8">
                        <FormRow containerClass="none">
                            <template #input>
                                <textarea
                                    v-model="editable.settings.palette_npmrc"
                                    :disabled="!isCustomCatalogsFeatureEnabled ? true : readOnly"
                                    class="font-mono w-full"
                                    placeholder=".npmrc"
                                    rows="8"
                                />
                            </template>
                        </FormRow>
                    </div>
                    <LockSetting
                        v-model="editable.policy.palette_npmrc"
                        :editTemplate="editTemplate"
                        :changed="editable.changed.policy.palette_npmrc"
                    />
                </div>
            </div>
        </form>
    </div>
</template>

<script>
import SemVer from 'semver'

import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import FeatureUnavailable from '../../../../components/banners/FeatureUnavailable.vue'
import featuresMixin from '../../../../mixins/Features.js'
import ChangeIndicator from '../components/ChangeIndicator.vue'
import LockSetting from '../components/LockSetting.vue'

export default {
    name: 'TemplateNPMEditor',
    components: {
        FeatureUnavailable,
        FormRow,
        FormHeading,
        ChangeIndicator,
        LockSetting
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
            npmrc: ''
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
            return SemVer.satisfies(SemVer.coerce(launcherVersion), '>=1.11.3')
        }
    },
    watch: {
        'editable.settings.palette_npmrc': {
            deep: true,
            handler (newValue) {
                this.npmrc = newValue
            }
        }
    }
}
</script>

<style lang="scss" scoped>
textarea:disabled {
  background-color: $ff-white;
  opacity: .9;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}
</style>
