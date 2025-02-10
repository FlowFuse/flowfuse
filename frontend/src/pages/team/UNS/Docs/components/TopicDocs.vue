<template>
    <div class="ff-topic-docs" :class="{'open': expanded}">
        <div class="ff-topic-docs-row-header" @click="expanded = !expanded">
            <label>{{ topic.address }}</label>
            <div>
                <ChevronLeftIcon class="ff-icon" />
            </div>
        </div>
        <div class="ff-topic-docs-row-meta">
            Meta Data
        </div>
    </div>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/outline'

export default {
    name: 'TopicDocs',
    components: {
        ChevronLeftIcon
    },
    props: {
        topic: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            expanded: false
        }
    }
}
</script>

<style lang="scss" scoped>
.ff-topic-docs {
    border: 1px solid $ff-blue-300;
    font-weight: bold;
    border-radius: 6px;
    &.open {
        .ff-icon {
            transform: rotate(-90deg);
        }
        .ff-topic-docs-row-header {
            border-bottom-left-radius: 0px;
            border-bottom-right-radius: 0px;
            border-bottom: 1px solid $ff-blue-300;
        }
        .ff-topic-docs-row-meta {
            padding: 12px;
            height: 100px;
        }
    }
}
.ff-icon {
    transition: 0.15s transform;
}
.ff-topic-docs-row-header {
    background-color: $ff-blue-50;
    padding: 12px;
    font-weight: bold;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    &:hover {
        cursor: pointer;
        background-color: $ff-blue-100;
    }
}
.ff-topic-docs-row-meta {
    padding: 0 12px;
    height: 0px;
    min-height: 0;
    overflow: hidden;
    transition: 0.3s height, 0.3s padding;
}
</style>
