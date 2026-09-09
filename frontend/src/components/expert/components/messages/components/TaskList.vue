<template>
    <collapsible-section
        v-if="items.length"
        class="ff-expert-tasklist"
        :auto-open="active"
        open-up
    >
        <template #header>
            <ListBulletIcon class="ff-expert-tasklist--glyph" />
            <span class="ff-expert-tasklist--title">{{ title }}</span>
            <span class="ff-expert-tasklist--count">{{ doneCount }}/{{ items.length }}</span>
        </template>
        <div class="ff-expert-tasklist--body">
            <div
                v-for="(item, index) in items"
                :key="item.id || index"
                class="ff-expert-tasklist--row"
                :class="`is-${item.status}`"
            >
                <span class="ff-expert-tasklist--status" aria-hidden="true">
                    <CheckCircleIcon v-if="item.status === 'done'" class="ff-expert-tasklist--done-icon" />
                    <span v-else class="ff-expert-tasklist--dot" />
                </span>
                <span class="ff-expert-tasklist--text">
                    {{ item.text }}
                    <span v-if="item.status === 'in_progress'" class="ff-expert-tasklist--running">(in progress)</span>
                </span>
            </div>
        </div>
    </collapsible-section>
</template>

<script>
import { CheckCircleIcon, ListBulletIcon } from '@heroicons/vue/20/solid'

import CollapsibleSection from './CollapsibleSection.vue'

export default {
    name: 'TaskList',
    components: { CollapsibleSection, ListBulletIcon, CheckCircleIcon },
    props: {
        items: {
            type: Array,
            required: true
        },
        title: {
            type: String,
            required: false,
            default: 'Planning'
        }
    },
    computed: {
        doneCount () {
            return this.items.filter(item => item.status === 'done').length
        },
        active () {
            return this.items.some(item => item.status === 'in_progress' || item.status === 'pending')
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-tasklist {
    border-top: 1px solid var(--ff-color-border);
    background: var(--ff-color-bg-app);

    :deep(.ff-collapsible--header) {
        padding: 0.5rem 1rem;
    }
}

.ff-expert-tasklist--glyph {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
}

.ff-expert-tasklist--title {
    font-weight: 500;
}

.ff-expert-tasklist--count {
    font-variant-numeric: tabular-nums;
    margin-left: auto;
}

.ff-expert-tasklist--body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem 0.25rem;
    max-height: 40vh;
    overflow-y: auto;
    cursor: default;
}

.ff-expert-tasklist--row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--ff-color-text);

    .ff-expert-tasklist--status {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1rem;
        height: 1rem;
        margin-top: 0.125rem;
    }

    .ff-expert-tasklist--done-icon {
        width: 1rem;
        height: 1rem;
        color: var(--ff-color-success);
    }

    .ff-expert-tasklist--dot {
        width: 0.6rem;
        height: 0.6rem;
        border-radius: 50%;
        box-sizing: border-box;
    }

    &.is-pending .ff-expert-tasklist--dot {
        border: 1.5px solid var(--ff-color-border-strong);
    }

    &.is-in_progress .ff-expert-tasklist--dot {
        background: var(--ff-color-accent);
        animation: ff-expert-tasklist-shimmer 1.4s ease-in-out infinite;
    }

    .ff-expert-tasklist--text {
        flex: 1;
        min-width: 0;
        line-height: 1.4;
    }

    &.is-done .ff-expert-tasklist--text {
        color: var(--ff-color-text-subtle);
        text-decoration: line-through;
    }

    &.is-in_progress .ff-expert-tasklist--text {
        font-weight: 500;
    }
}

.ff-expert-tasklist--running {
    color: var(--ff-color-text-subtle);
    font-weight: 400;
    animation: ff-expert-tasklist-shimmer 1.4s ease-in-out infinite;
}

@keyframes ff-expert-tasklist-shimmer {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 1; }
}
</style>
