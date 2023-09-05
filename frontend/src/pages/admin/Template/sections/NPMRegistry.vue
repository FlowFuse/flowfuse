<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading>
            NPM configuration file
        </FormHeading>
        
        <FormRow>
            <template #input><textarea class="font-mono w-full" v-model="editable.settings.palette_npmrc" placeholder=".npmrc" rows="8" /></template>
            <template #append>
                <ChangeIndicator :value="editable.changed.settings.palette_npmrc" />
                <LockSetting v-model="editable.policy.palette_npmrc" :editTemplate="editTemplate" :changed="editable.changed.policy.palette_npmrc" />
            </template>
        </FormRow>
    </form>
</template>

<script>
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
