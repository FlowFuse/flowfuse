<template>
    <div class="ff-radio-group" :class="'ff-radio-group--' + orientation">
        <label class="ff-radio-group-label" v-if="label">{{ label }}</label>
        <ff-radio-button v-for="option in internalOptions" :key="option.label"
            :value="option.value" :label="option.label" :checked="option.checked"
            @select="select"></ff-radio-button>
    </div>
</template>

<script>
export default {
    name: 'ff-radio-group',
    props: {
        modelValue: {
            default: null,
            type: [String, Number]
        },
        label: {
            default: '',
            type: String
        },
        orientation: {
            default: 'horizontal',
            type: String
        },
        options: {
            default: null,
            type: Array
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
            internalOptions: this.options
        }
    },
    mounted () {
        // make sure we don't have two options checked
        let hasCheck = false
        this.options.forEach((option, i) => {
            this.internalOptions[i].checked = (option.checked && !hasCheck) ? option.checked : false
            if (this.internalOptions[i].checked) {
                hasCheck = true
                this.$emit('update:modelValue', option.value)
            }
        })
    },
    methods: {
        select: function (val) {
            this.options.forEach((option, i) => {
                this.internalOptions[i].checked = (option.value === val)
            })
            this.$emit('update:modelValue', val)
        }
    }
}
</script>
