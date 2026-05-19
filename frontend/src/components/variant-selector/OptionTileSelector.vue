<template>
    <div>
        <label v-if="title" class="block font-bold mb-2">{{ title }}</label>
        <ul
            class="ff-option-tile-selector grid gap-2"
            :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
        >
            <li
                v-for="option in options"
                :key="option.id"
                class="ff-option-tile p-4 border rounded-sm bg-white border-gray-200 cursor-pointer flex items-center justify-center gap-2"
                :class="{ 'border-blue-600': modelValue === option.id }"
                @click="$emit('update:modelValue', option.id)"
            >
                <img v-if="option.icon" :src="option.icon" class="w-6 h-6" :alt="option.iconAlt || option.label">
                <span>{{ option.label }}</span>
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    name: 'OptionTileSelector',
    props: {
        modelValue: {
            required: true,
            type: String
        },
        options: {
            required: true,
            type: Array
        },
        columns: {
            required: false,
            type: Number,
            default: 3
        },
        title: {
            required: false,
            type: String,
            default: null
        }
    },
    emits: ['update:modelValue']
}
</script>

<style scoped lang="scss">
.ff-option-tile-selector {
    .ff-option-tile {
        transition: border-color ease-in-out .3s;
    }
}
</style>
