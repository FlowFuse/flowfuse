<template>
    <!-- Info Banner -->
    <div class="info-banner">
        <template v-if="isSupportAgent">
            <p class="info-text">
                AI agent has access to all of FlowFuse's
                <a
                    href="https://flowfuse.com/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="info-link"
                >documentation and knowledge</a>,
                <a
                    href="https://flowfuse.com/blog"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="info-link"
                >blogposts</a>, and more.
            </p>
        </template>
        <template v-if="isOperatorAgent">
            <p class="info-text">
                <span
                    title="This feature is still under development"
                    class="beta-badge"
                >BETA</span>
                AI agent can access
                <a
                    href="https://flowfuse.com/node-red/flowfuse/mcp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="info-link"
                >MCP server tools</a>
                configured in your hosted Node-RED instances.
            </p>
        </template>
    </div>
</template>

<script>
import { mapState } from 'pinia'

import { useProductExpertStore } from '@/stores/product-expert.js'

export default {
    name: 'InfoBanner',
    computed: {
        ...mapState(useProductExpertStore, ['isSupportAgent', 'isOperatorAgent'])
    }
}
</script>

<style scoped lang="scss">

.info-banner {
    background-color: #eef2ff; // indigo-100
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.75rem 1rem;

    .info-text {
        color: #4338ca; // indigo-700
        font-size: 0.875rem;
        margin: 0;
        line-height: 1.5;
    }

    .info-link {
        color: inherit;
        text-decoration: underline;

        &:hover {
            color: #3730a3; // indigo-800
        }
    }

    .beta-badge {
        display: inline-block;
        background-color: #818cf8; // indigo-400
        color: white;
        font-size: 0.625rem;
        font-weight: 600;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        cursor: help;
        vertical-align: text-top;
    }
}
</style>
