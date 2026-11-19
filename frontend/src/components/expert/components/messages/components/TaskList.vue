<template>
    <collapsible-section
        v-if="items.length"
        class="ff-expert-tasklist"
        auto-open
    >
        <template #header>
            <ListBulletIcon class="ff-expert-tasklist--glyph" />
            <span class="ff-expert-tasklist--title">{{ title }}</span>
            <span class="ff-expert-tasklist--count">{{ doneCount }}/{{ items.length }}</span>
        </template>
        <ul class="ff-expert-tasklist--body">
            <li
                v-for="(item, index) in items"
                :key="item.id || index"
                class="ff-expert-tasklist--row"
                :class="`is-${item.status}`"
            >
                {{ item.text }}<span class="ff-expert-tasklist--status">{{ statusLabel(item.status) }}</span>
            </li>
        </ul>
    </collapsible-section>
</template>

<script>
import { ListBulletIcon } from '@heroicons/vue/20/solid'

import CollapsibleSection from './CollapsibleSection.vue'

export default {
    name: 'TaskList',
    components: { CollapsibleSection, ListBulletIcon },
    props: {
        items: {
            type: Array,
            required: true
        },
        title: {
            type: String,
            required: false,
            default: 'Tasks'
        }
    },
    computed: {
        doneCount () {
            return this.items.filter(item => item.status === 'done').length
        }
    },
    methods: {
        statusLabel (status) {
            switch (status) {
            case 'in_progress':
                return '(In Progress)'
            case 'done':
                return '(Done)'
            default:
                return '(To Do)'
            }
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
    font-size: 1rem;
    font-weight: 500;
}

.ff-expert-tasklist--count {
    font-variant-numeric: tabular-nums;
    margin-left: auto;
}

.ff-expert-tasklist--body {
    list-style: disc;
    padding: 0.75rem 1rem 1.25rem 2rem;
    max-height: 40vh;
    overflow-y: auto;
    cursor: default;
}

.ff-expert-tasklist--row {
    font-size: 1rem;
    line-height: 1.4;
    color: var(--ff-color-text);

    & + & {
        margin-top: 0.5rem;
    }

    &.is-done {
        color: var(--ff-color-text-subtle);
        text-decoration: line-through;
    }

    &.is-in_progress {
        font-style: italic;
    }
}

.ff-expert-tasklist--status {
    margin-left: 0.375rem;
    font-size: 0.875rem;
    display: inline-block;
    text-decoration: none;
    font-style: normal;
    white-space: nowrap;
    color: var(--ff-color-text-subtle);

    .is-in_progress & {
        color: var(--ff-color-accent);
    }
}
</style>
