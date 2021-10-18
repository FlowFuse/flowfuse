<template>
    <div class="max-w-sm">
        <template v-if="type==='checkbox'">
            <div class="flex items-center">
                <input :id="id"
                       type="checkbox"
                    class="text-sm appearance-none rounded relative font-normal mr-3 px-2 py-1 border border-gray-300 placeholder-gray-500 text-gray-600 focus:outline-none  focus:ring-blue-700 focus:border-indigo-500"
                    :class="[{'opacity-30':disabled}]"
                    v-model="modelValue"
                    :disabled="disabled"
                    @change="$emit('update:modelValue', $event.target.checked)"
                >
                <label :for="id" class="text-sm font-medium text-gray-700"><slot></slot></label>
                <div v-if="hasAppend" class="inline ml-2"><slot name="append"></slot></div>
            </div>
            <div v-if="hasDescription" class="mt-1 text-xs text-gray-400 mb-2 ml-8"><slot name="description"></slot></div>
        </template>
        <template v-else-if="type==='radio'">
            <div class="flex items-center">
                <input :id="id"
                       type="radio"
                    class="text-sm appearance-none rounded relative font-normal mr-3 px-2 py-1 border border-gray-300 placeholder-gray-500 text-gray-600 focus:outline-none  focus:ring-blue-700 focus:border-indigo-500"
                    :class="[{'opacity-30':disabled}]"
                    v-model="modelValue"
                    :name="name"
                    :value="value"
                    :disabled="disabled"
                    @change="$emit('update:modelValue', $event.target.value)"
                >
                <label :for="id" class="text-sm font-medium text-gray-700"><slot></slot></label>
            </div>
            <div v-if="hasDescription" class="mt-1 text-xs text-gray-400 mb-2 ml-8"><slot name="description"></slot></div>
        </template>
        <template v-else>
            <label :for="id" class="block text-sm font-medium text-gray-700 mb-1"><slot></slot></label>
            <div v-if="hasDescription" class="text-xs text-gray-400 mb-2"><slot name="description"></slot></div>
            <div class="flex">
                <template v-if="options">
                    <select :id="id"
                        class="text-sm appearance-none rounded relative font-normal w-full px-2 py-1 border border-gray-300 placeholder-gray-500 text-gray-600 focus:outline-none  focus:ring-blue-700 focus:border-indigo-500"
                        :class="[{'opacity-30':disabled}]"
                        :value="modelValue"
                        :disabled="disabled"
                        @input="$emit('update:modelValue', $event.target.value)"
                    >
                    <option v-for="option in options" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
                </template>
                <template v-else>
                    <input :id="id"
                           :type="type"
                           :placeholder="placeholder"
                           :disabled="disabled"
                        class="text-sm appearance-none rounded relative font-normal w-full px-2 py-1 border border-gray-300 placeholder-gray-500 text-gray-600 focus:outline-none  focus:ring-blue-700 focus:border-indigo-500 placeholder-gray-400"
                        :class="[{'opacity-30':disabled}]"
                        :value="modelValue"
                        @input="$emit('update:modelValue', $event.target.value)"
                        @keyup.enter="onEnter"
                        @blur="onBlur"
                    >
                </template>
                <slot name="append"></slot>
            </div>
        </template>
        <div v-if="error" class="float-right ml-4 text-red-400  inline text-xs">{{error}}</div>
    </div>
</template>
<script>
import {ref} from "vue";
export default {
    name: "FormRow",
    props: ['id','type','name','value','disabled','modelValue','error','options','placeholder','onEnter','onBlur'],
    emits: ['update:modelValue'],
    setup(props, {slots}) {
        const hasDescription = ref(false)
        const hasAppend = ref(false)
        if (slots.description && slots.description().length) {
            hasDescription.value = true
        }
        if (slots.append && slots.append().length) {
            hasAppend.value = true
        }

        return {
            hasDescription,
            hasAppend
        }
    }
}
</script>
