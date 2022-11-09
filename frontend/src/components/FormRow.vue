<template>
    <div :class="containerClass ? containerClass : 'max-w-sm'">
        <template v-if="type==='checkbox'">
            <div class="flex" :class="(wrapperClass ? wrapperClass : 'items-center')">
                <div>
                    <ff-checkbox :id="inputId"
                                 ref="input"
                                 type="checkbox"
                                 :label="null"
                                 :class="inputClass"
                                 v-model="localModelValue"
                                 :disabled="disabled"></ff-checkbox>
                    <label v-if="hasTitle" :for="inputId" class="inline-block ml-9 -mt-1 font-medium cursor-pointer" @click="localModelValue = !localModelValue"><slot></slot></label>
                </div>
                <div v-if="hasAppend" :class="appendClass ? appendClass : 'inline ml-2'"><slot name="append"></slot></div>
            </div>
            <div v-if="error" class="inline-block ml-9 text-red-400 inline text-xs">{{error}}</div>
            <div v-if="hasDescription" class="ff-description pl-9 mt-1"><slot name="description"></slot></div>
        </template>
        <template v-else-if="type==='radio'">
            <div class="flex" :class="(wrapperClass ? wrapperClass : 'items-center')  + (disabled ? ' cursor-not-allowed' : '')">
                <input :id="inputId"
                       ref="input"
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
        <template v-else-if="type==='file'">
            <label v-if="hasTitle" :for="inputId" class="text-sm font-medium text-gray-700"><slot></slot></label>
            <div class="flex" :class="(wrapperClass ? wrapperClass : 'items-center')">
                <div class="ff-input ff-text-input">
                    <input :id="inputId"
                           type="file"
                           :class="inputClass"
                           :accept="accept"
                           :name="name"
                           :placeholder="placeholder"
                           :disabled="disabled"
                           @change="$emit('update:modelValue', { obj: $event.target, val: $event.target.value})"
                    >
                </div>
            </div>
            <div v-if="error" class="ml-9 text-red-400 inline text-xs">{{error}}</div>
            <div v-if="hasDescription" class="mt-1 text-xs text-gray-400 mb-2 ml-9 space-y-1"><slot name="description"></slot></div>
        </template>
        <template v-else>
            <label v-if="hasTitle" :for="inputId" :class="(disabled ? 'text-gray-400' : 'text-gray-700')" class="block text-sm font-medium mb-1"><slot></slot></label>
            <div v-if="hasDescription" class="text-xs text-gray-400 mb-2 space-y-1"><slot name="description"></slot></div>
            <div :class="(wrapperClass ? wrapperClass : 'flex flex-col sm:flex-row relative')">
                <template v-if="options && type !== 'uneditable'">
                    <select :id="inputId"
                            ref="input"
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
                    <div class="w-full uneditable" :class="inputClass + (disabled ? ' text-gray-400' : ' text-gray-700')">{{ modelValue || (valueEmptyText == null ? 'No Value' : valueEmptyText ) }}</div>
                </template>
                <template v-else>
                    <ff-text-input
                        ref="input"
                        v-model="localModelValue"
                        :placeholder="placeholder"
                        :disabled="disabled"
                        :type="type"
                        @enter="$emit('enter')"
                        @blur="$emit('blur')" />
                </template>
                <template v-if="hasAppend">
                    <div :class="appendClass ? appendClass : 'block sm:inline sm:absolute sm:left-full sm:ml-4 mt-2 sm:mt-0'"><slot name="append"></slot></div>
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
    props: ['id', 'type', 'name', 'value', 'disabled', 'modelValue', 'valueEmptyText', 'error', 'options', 'placeholder', 'containerClass', 'wrapperClass', 'inputClass', 'appendClass', 'accept'],
    emits: ['update:modelValue', 'blur', 'enter'],
    computed: {
        inputId () {
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
    },
    methods: {
        focus () {
            this.$nextTick(() => {
                this.$refs.input?.focus()
            })
        }
    }
}
</script>
