<template>
    <div class="">
        <FormRow class="w-24" v-model="localValue" type="select" :options="[{label:'Editable', value:true},{label:'Locked', value:false}]">
            <template #append><ChangeIndicator :value="changed"></ChangeIndicator></template>
        </FormRow>
    </div>
</template>
<script>
import FormRow from '@/components/FormRow'
import ChangeIndicator from './ChangeIndicator'

function toBoolean(v) {
    return v === "true"  || v === true
}
export default {
    name: 'LockSetting',
    props: ['modelValue', 'changed'],
    emits: ['update:modelValue'],
    computed: {
        localValue: {
            get() { return this.modelValue },
            set(localValue) {this.$emit('update:modelValue', toBoolean(localValue)) }
        }
    },
    components: { FormRow, ChangeIndicator }
}
</script>