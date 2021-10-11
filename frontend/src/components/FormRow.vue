<template>
    <div class="max-w-sm">
        <label :for="id" class="block text-sm font-medium text-gray-700 mb-1"><slot></slot></label>
        <div v-if="hasDescription" class="text-xs text-gray-400 mb-2"><slot name="description"></slot></div>
        <div class="flex">
            <template v-if="options">
                <select :id="id"
                    class="text-sm appearance-none rounded relative font-normal w-full px-2 py-1 border border-gray-300 placeholder-gray-500 text-gray-600 focus:outline-none  focus:ring-blue-700 focus:border-indigo-500"
                    :value="modelValue"
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
                    class="text-sm appearance-none rounded relative font-normal w-full px-2 py-1 border border-gray-300 placeholder-gray-500 text-gray-600 focus:outline-none  focus:ring-blue-700 focus:border-indigo-500 placeholder-gray-400"
                    :value="modelValue"
                    @input="$emit('update:modelValue', $event.target.value)"
                    @keyup.enter="onEnter"
                >
            </template>
            <slot name="append"></slot>
        </div>
        <div v-if="error" class="float-right ml-4 text-red-400  inline text-xs">{{error}}</div>
    </div>
</template>
<script>
import {ref} from "vue";
export default {
    name: "FormRow",
    props: ['id','type','modelValue','error','options','placeholder','onEnter'],
    emits: ['update:modelValue'],
    setup(props, {slots}) {
        const hasDescription = ref(false)
        if (slots.description && slots.description().length) {
            hasDescription.value = true
        }
        return {
            hasDescription
        }
    }
}
</script>
