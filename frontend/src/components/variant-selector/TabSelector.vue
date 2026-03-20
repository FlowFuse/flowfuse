<template>
    <div class="ff-tab-selector">
        <template v-for="(option, index) in options" :key="option.id">
            <div
                class="ff-tab-option"
                :class="{ active: modelValue === option.id }"
                @click="$emit('update:modelValue', option.id)"
            >
                {{ option.label }}
            </div>
            <span
                v-if="separator && index < options.length - 1"
                class="ff-tab-separator"
            >
                {{ separator }}
            </span>
        </template>
    </div>
</template>

<script>
export default {
    name: 'TabSelector',
    props: {
        modelValue: {
            required: true,
            type: String
        },
        options: {
            required: true,
            type: Array
        },
        separator: {
            required: false,
            type: String,
            default: null
        }
    },
    emits: ['update:modelValue']
}
</script>

<style scoped lang="scss">
.ff-tab-selector {
    display: flex;
    align-items: flex-end;
    margin-bottom: 15px;

    .ff-tab-option {
        flex: 1;
        text-align: center;
        border-bottom: 2px solid $ff-color--border;
        padding-bottom: 5px;
        cursor: pointer;
        transition: border-color ease-in-out .3s;

        &.active {
            border-color: $ff-indigo-500;
        }
    }

    .ff-tab-separator {
        flex-shrink: 0;
        font-style: italic;
        font-size: $ff-funit-sm;
        color: $ff-grey-500;
        padding: 0 12px 5px;
        border-bottom: 2px solid transparent; // keeps height aligned with tabs
    }
}
</style>
