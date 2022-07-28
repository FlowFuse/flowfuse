<template>
    <div class="max-w-sm">
        <template v-if="type==='checkbox'">
            <div class="flex items-center">
                <input :id="inputId"
                       type="checkbox"
                       :class="inputClass"
                       v-model="localModelValue"
                       :disabled="disabled"
                       @change="$emit('update:modelValue', $event.target.checked)"
                >
                <label v-if="hasTitle" :for="inputId" class="text-sm font-medium text-gray-700"><slot></slot></label>
                <div v-if="hasAppend" class="inline ml-2"><slot name="append"></slot></div>
            </div>
            <div v-if="error" class="ml-9 text-red-400 inline text-xs">{{error}}</div>
            <div v-if="hasDescription" class="mt-1 text-xs text-gray-400 mb-2 ml-9 space-y-1"><slot name="description"></slot></div>
        </template>
        <template v-else-if="type==='radio'">
            <div class="flex items-center">
                <input :id="inputId"
                       type="radio"
                       :class="inputClass"
                       v-model="localModelValue"
                       :name="name"
                       :value="value"
                       :disabled="disabled"
                       @change="$emit('update:modelValue', $event.target.value)"
                >
                <label v-if="hasTitle" :for="inputId" class="text-sm font-medium text-gray-700"><slot></slot></label>
            </div>
            <div v-if="error" class="ml-9 text-red-400 inline text-xs">{{error}}</div>
            <div v-if="hasDescription" class="mt-1 text-xs text-gray-400 mb-2 ml-9 space-y-1"><slot name="description"></slot></div>
        </template>
        <template v-else>
            <label v-if="hasTitle" :for="inputId" class="block text-sm font-medium text-gray-700 mb-1"><slot></slot></label>
            <div v-if="hasDescription" class="text-xs text-gray-400 mb-2 space-y-1"><slot name="description"></slot></div>
            <div class="flex flex-col sm:flex-row relative">
                <template v-if="options && type !== 'uneditable'">
                    <select :id="inputId"
                            class="w-full"
                            :class="inputClass"
                            :value="modelValue"
                            :disabled="disabled"
                            @input="$emit('update:modelValue', $event.target.value)"
                    >
                        <option v-for="option in options" :value="option.value" :key="option.label">
                            {{ option.label }}
                        </option>
                    </select>
                </template>
                <template v-else-if="hasCustomInput">
                    <slot name="input"></slot>
                </template>
                <template v-else-if="type==='uneditable'">
                    <div class="w-full uneditable" :class="inputClass">{{modelValue}}</div>
                </template>
                <template v-else>
                    <ff-text-input
                        ref="text_input"
                        v-model="localModelValue"
                        :placeholder="placeholder"
                        :disabled="disabled"
                        :type="type"
                        @keyup.enter.prevent="$emit('enter')"
                        @blur="$emit('blur')"/>
                </template>
                <template v-if="hasAppend">
                    <div class="block sm:inline sm:absolute sm:left-full sm:ml-4 mt-2 sm:mt-0"><slot name="append"></slot></div>
                </template>
            </div>
            <div v-if="error" class="ml-4 text-red-400 text-xs">{{error}}</div>
        </template>
    </div>
</template>
<script>
import { ref } from 'vue'
let instanceCount = 0
export default {
    name: 'FormRow',
    props: ['id', 'type', 'name', 'value', 'disabled', 'modelValue', 'error', 'options', 'placeholder', 'inputClass'],
    emits: ['update:modelValue', 'blur', 'enter'],
    computed: {
        inputId: function () {
            return this.id || 'formRow-instance-' + (instanceCount++)
        },
        localModelValue: {
            get () { return this.modelValue },
            set (localModelValue) { this.$emit('update:modelValue', localModelValue) }
        }
    },
    data () {
        return {
            rowValue: null
        }
    },
    setup (props, { slots }) {
        const hasTitle = ref(false)
        const hasDescription = ref(false)
        const hasAppend = ref(false)
        const hasCustomInput = ref(false)
        if (slots.default && slots.default().length) {
            hasTitle.value = true
        }
        if (slots.description && slots.description().length) {
            hasDescription.value = true
        }
        if (slots.append && slots.append().length) {
            hasAppend.value = true
        }
        if (slots.input && slots.input().length) {
            hasCustomInput.value = true
        }
        return {
            hasTitle,
            hasDescription,
            hasAppend,
            hasCustomInput
        }
    }
}
</script>
