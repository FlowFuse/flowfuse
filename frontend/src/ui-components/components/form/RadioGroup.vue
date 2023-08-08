<template>
    <div class="ff-radio-group">
        <label v-if="label" class="ff-radio-group-label">{{ label }}</label>
        <div class="ff-radio-group-options" :class="'ff-radio-group--' + orientation" :style="orientation === 'grid' ? {'grid-template-columns': `repeat(${columns}, 1fr)`} : ''">
            <ff-radio-button
                v-for="option in internalOptions" :key="option.label" ref="inputs"
                :value="option.value" :label="option.label" :checked="option.checked"
                :description="option.description"
                :disabled="option.disabled"
                :hide-description="orientation === 'horizontal'"
                @select="select"
            />
        </div>
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
        columns: {
            default: 2,
            type: Number
        },
        options: {
            default: null,
            type: Array
        }
    },
    emits: ['update:modelValue'],
    data: function () {
        return {
            internalOptions: this.options
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
                this.internalOptions[i].label = option.label
                this.internalOptions[i].description = option.description
                this.internalOptions[i].disabled = option.disabled
                this.internalOptions[i].checked = (option.value === this.modelValue)
                if (this.internalOptions[i].checked) {
                    // emit the new checked value v-model bound to this group
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
