<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading>
            NPM configuration file
        </FormHeading>

        <div v-if="!projectLauncherCompatible" class="text-red-400 space-y-1">
            <p>You will need to update your Project Stack to use this feature.</p>
            <div v-if="project.stack.replacedBy">
                <ff-button size="small" to="./settings/danger">Update</ff-button>
            </div>
        </div>

        <FormRow>
            <template #input><textarea v-model="editable.settings.palette_npmrc" class="font-mono w-full max-w-md sm:mr-8" placeholder=".npmrc" rows="8" /></template>
            <template #append>
                <ChangeIndicator :value="editable.changed.settings.palette_npmrc" />
                <LockSetting v-model="editable.policy.palette_npmrc" :editTemplate="editTemplate" :changed="editable.changed.policy.palette_npmrc" />
            </template>
        </FormRow>
    </form>
</template>

<script>
import SemVer from 'semver'

import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import ChangeIndicator from '../components/ChangeIndicator.vue'
import LockSetting from '../components/LockSetting.vue'

export default {
    name: 'TemplateNPMEditor',
    components: {
        FormRow,
        FormHeading,
        ChangeIndicator,
        LockSetting
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
            // TODO needs to semver >= 1.12.0
            return SemVer.satisfies(launcherVersion, '>=1.11.0')
        }
    },
    watch: {
        'editable.settings.palette_npmrc': {
            deep: true,
            handler (v) {
                this.npmrc = v
            }
        }
    }
}
</script>
