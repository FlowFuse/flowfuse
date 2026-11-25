<template>
    <div class="ff-tag-input" :class="{'ff-tag-input--disabled': disabled}">
        <span v-for="(value, index) in modelValue" :key="value" class="ff-tag-input__tag">
            {{ value }}
            <button type="button" :aria-label="`Remove ${value}`" :disabled="disabled" @click="remove(index)">
                <XMarkIcon class="ff-icon-sm" />
            </button>
        </span>
        <input
            ref="input"
            v-model="pending"
            type="text"
            :aria-label="ariaLabel"
            :placeholder="placeholder"
            :disabled="disabled"
            @keydown="onKeydown"
        >
    </div>
</template>

<script>
import { XMarkIcon } from '@heroicons/vue/20/solid'

export default {
    name: 'ff-tag-input',
    components: { XMarkIcon },
    props: {
        modelValue: {
            type: Array,
            default: () => []
        },
        ariaLabel: {
            type: String,
            default: null
        },
        placeholder: {
            type: String,
            default: null
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
            pending: ''
        }
    },
    methods: {
        // Adds what is typed. Called by the parent too, so a value typed but not yet entered isn't lost
        commit () {
            const value = this.pending.trim()
            this.pending = ''
            if (value && !this.modelValue.includes(value)) {
                this.$emit('update:modelValue', [...this.modelValue, value])
            }
        },
        remove (index) {
            this.$emit('update:modelValue', this.modelValue.filter((_, position) => position !== index))
        },
        onKeydown (event) {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                this.commit()
            } else if (event.key === 'Backspace' && !this.pending && this.modelValue.length) {
                this.remove(this.modelValue.length - 1)
            }
        },
        focus () {
            this.$refs.input?.focus()
        }
    }
}
</script>
