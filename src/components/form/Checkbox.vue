<template>
    <label class="ff-checkbox">
        <input type="checkbox" :value="modelValue" v-model="model" />
        <span class="checkbox" :checked="model"></span>
        <label @click="model = !model">
            <slot>{{ label }}</slot>
        </label>
    </label>
</template>

<script>
export default {
    name: 'ff-checkbox',
    props: ['label', 'modelValue'],
    emits: ['update:modelValue'],
    computed: {
        model: {
            get () {
                return this.modelValue
            },
            set (value) {
                this.$emit('update:modelValue', value)
            }
        }
    }

}
</script>
