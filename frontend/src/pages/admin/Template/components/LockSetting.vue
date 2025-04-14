<template>
    <div class="">
        <div v-if="locked" v-ff-tooltip="tooltip">
            <LockClosedIcon class="w-4 mb-2" />
        </div>
        <FormRow
            v-else-if="editTemplate"
            v-model="localValue"
            class="w-auto"
            type="select"
            wrapper-class="flex gap-15"
            append-class="ml-2"
            :options="[{label:'Editable', value:true},{label:'Locked', value:false}]"
        >
            <template #append><ChangeIndicator class="mt-2" :value="changed" /></template>
        </FormRow>
    </div>
</template>
<script>
import { LockClosedIcon } from '@heroicons/vue/outline'

import FormRow from '../../../../components/FormRow.vue'

import ChangeIndicator from './ChangeIndicator.vue'

function toBoolean (v) {
    return v === 'true' || v === true
}
export default {
    name: 'LockSetting',
    components: { FormRow, ChangeIndicator, LockClosedIcon },
    props: {
        // eslint-disable-next-line vue/require-prop-types
        modelValue: {
            // This can be null/undefined/boolean
            default: false
        },
        changed: {
            type: Boolean,
            default: false
        },
        editTemplate: {
            type: Boolean,
            default: false
        },
        tooltip: {
            type: String,
            default: 'This setting has been locked by the Project\'s Template.'
        }
    },
    emits: ['update:modelValue'],
    computed: {
        locked () {
            return !this.editTemplate && !this.localValue
        },
        localValue: {
            get () { return this.modelValue },
            set (localValue) { this.$emit('update:modelValue', toBoolean(localValue)) }
        }
    }
}
</script>
