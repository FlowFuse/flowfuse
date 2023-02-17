<template>
    <div class="ff-radio-group" :class="'ff-radio-group--' + orientation">
        <label v-if="label" class="ff-radio-group-label">{{ label }}</label>
        <ff-radio-button v-for="option in internalOptions" :key="option.label" ref="inputs"
            :value="option.value" :label="option.label" :checked="option.checked"
            :description="option.description"
            :disabled="option.disabled"
            :hide-description="orientation === 'horizontal'"
            @select="select"
        ></ff-radio-button>
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
    computed: {
        internalOptions () {
            return this.options
        }
    },
    watch: {
        modelValue: function () {
            this.checkOptions()
        },
        internalOptions: function () {
            this.checkOptions()
        }
    },
    mounted () {
        this.checkOptions()
    },
    methods: {
        select: function (val) {
            this.$emit('update:modelValue', val)
        },
        checkOptions () {
            this.options.forEach((option, i) => {
                this.internalOptions[i].checked = (option.value === this.modelValue)
                if (this.internalOptions[i].checked) {
                    this.$emit('update:modelValue', option.value)
                }
            })
        },
        focus () {
            this.$refs.inputs?.[0]?.focus()
        },
        blur () {
            for (const input of this.$refs.inputs) {
                input.blur()
            }
        }
    }
}
</script>
