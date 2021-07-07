<template>
    <div>
        <label :for="id" class="block text-sm font-medium text-gray-700 mb-1"><slot></slot></label>
        <input :id="id"
               :type="type"
            class="text-sm appearance-none rounded block sm:inline relative font-normal max-w-sm w-full px-2 py-1 border border-gray-300 placeholder-gray-500 text-gray-600 focus:outline-none  focus:ring-blue-700 focus:border-indigo-500"
            :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
        >
        <div v-if="error" class="ml-4 text-red-400 font-medium inline text-sm">{{error}}</div>
    </div>
</template>
<script>
export default {
    name: "FormRow",
    props: ['id','type','modelValue','error'],
    emits: ['update:modelValue']
}
</script>
