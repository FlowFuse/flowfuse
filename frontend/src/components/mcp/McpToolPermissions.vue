<template>
    <div class="grid grid-cols-5 items-center gap-y-2" :class="{ 'opacity-50': disabled }" data-el="mcp-tool-permissions">
        <span class="col-span-2" />
        <span
            v-for="category in categories"
            :key="category.value"
            v-ff-tooltip="category.tooltip"
            class="flex items-center justify-center gap-1 text-xs font-medium text-gray-500"
            :class="{ 'cursor-help': category.tooltip }"
            :data-category="category.value"
        >
            {{ category.label }}
            <InformationCircleIcon v-if="category.tooltip" class="w-3.5 h-3.5" />
        </span>
        <div v-for="row in rows" :key="row.group" class="contents" :data-group="row.group">
            <span class="col-span-2 text-sm whitespace-nowrap">{{ row.label }}</span>
            <div v-for="category in categories" :key="category.value" class="flex justify-center">
                <!-- h-4: without a label the glyph is absolutely positioned, so the checkbox has no height of its own -->
                <ff-checkbox
                    class="h-4"
                    :model-value="modelValue[row.group][category.value]"
                    :disabled="disabled"
                    @update:model-value="value => onToggle(row.group, category.value, value)"
                />
            </div>
        </div>
    </div>
</template>

<script>
import { InformationCircleIcon } from '@heroicons/vue/20/solid'

function withCategory (categories, category, value) {
    const next = { ...categories, [category]: value }
    if (value) {
        if (category === 'write') {
            next.read = true
        } else if (category === 'destructive') {
            next.write = true
            next.read = true
        }
    } else {
        if (category === 'read') {
            next.write = false
            next.destructive = false
        } else if (category === 'write') {
            next.destructive = false
        }
    }
    return next
}

export default {
    name: 'McpToolPermissions',
    components: {
        InformationCircleIcon
    },
    props: {
        modelValue: {
            type: Object,
            required: true
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
            categories: [
                { value: 'read', label: 'Read' },
                { value: 'write', label: 'Write' },
                {
                    value: 'destructive',
                    label: 'Destructive',
                    tooltip: "Tools that delete or overwrite data, or change what's running."
                }
            ],
            rows: [
                { group: 'platform', label: 'Platform' },
                { group: 'flow_building', label: 'Flow Building' }
            ]
        }
    },
    methods: {
        onToggle (group, category, value) {
            this.$emit('update:modelValue', {
                ...this.modelValue,
                [group]: withCategory(this.modelValue[group], category, value)
            })
        }
    }
}
</script>
