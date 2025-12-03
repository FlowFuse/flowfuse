<template>
    <div class="ff-expert-rich-resources">
        <!-- Title -->
        <div class="resources-header">
            <h3 class="resources-title">{{ resources.title }}</h3>
            <p v-if="resources.content" class="resources-content">{{ resources.content }}</p>
        </div>

        <!-- Resources List -->
        <div v-if="hasAdditionalResources" class="resources-list">
            <h4 v-if="hasFlows" class="section-title">Related Resources</h4>
            <div class="resources-grid">
                <StandardResourceCard v-for="(resource, index) in additionalResources" :key="index" :resource="resource" />
            </div>
        </div>

        <!-- nodePackages List -->
        <div v-if="hasNodePackages" class="resources-list">
            <h4 v-if="hasFlows || hasAdditionalResources" class="section-title">Required Node Packages</h4>
            <div class="resources-grid">
                <PackageResourceCard v-for="(node, index) in nodePackages" :key="index" :nodePackage="node" />
            </div>
        </div>

        <!-- Flows List -->
        <div v-if="hasFlows" class="flows-list">
            <h4 v-if="hasAdditionalResources || hasNodePackages" class="section-title">Example Flows</h4>
            <ul class="flows-list flex flex-col gap-2">
                <li v-for="flow in flows" :key="flow.id">
                    <FlowResourceCard :flow="flow" />
                </li>
            </ul>
        </div>
    </div>
</template>

<script>

import FlowResourceCard from './resources/FlowResourceCard.vue'
import PackageResourceCard from './resources/PackageResourceCard.vue'
import StandardResourceCard from './resources/StandardResourceCard.vue'

export default {
    name: 'ExpertRichResources',
    components: { StandardResourceCard, FlowResourceCard, PackageResourceCard },
    props: {
        message: {
            type: Object,
            required: true,
            validator: (message) => {
                return message.resources.title !== undefined &&
                    (message.resources.resources !== undefined || message.resources.flows)
            }
        }
    },
    computed: {
        additionalResources () {
            return this.resources.resources
        },
        hasAdditionalResources () {
            return this.resources.resources && this.resources.resources.length > 0
        },
        hasNodePackages () {
            return this.resources.nodePackages && this.resources.nodePackages.length > 0
        },
        hasFlows () {
            return this.resources.flows && this.resources.flows.length > 0
        },
        resources () {
            return this.message.resources
        },
        flows () {
            return this.resources.flows
        },
        nodePackages () {
            return this.resources.nodePackages
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-rich-resources {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.resources-header {
    margin-bottom: 1rem;

    .resources-title {
        font-size: 1.125rem; // text-lg
        font-weight: 600; // font-semibold
        color: #111827; // text-gray-900
        margin: 0 0 0.5rem 0; // mb-2
        line-height: 1.3;
    }

    .resources-content {
        color: #374151; // text-gray-700
        margin: 0;
        line-height: 1.5;
        font-size: 1rem;
    }
}

.section-title {
    font-size: 1rem; // text-base
    font-weight: 500; // font-medium
    color: #111827; // text-gray-900
    margin: 0.5rem 0 0.75rem 0; // mt-2 mb-3
}

.resources-list {
    .resources-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .resource-card {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.75rem;
        background-color: white;
        border: 1px solid var(--ff-grey-200);
        border-radius: 0.5rem;
        text-decoration: none;
        color: var(--ff-grey-900);
        transition: all 0.2s ease;

        &:hover {
            border-color: var(--ff-indigo-300);
            background-color: var(--ff-grey-50);
        }
    }

    .resource-icon {
        flex-shrink: 0;
        width: 1rem;
        height: 1rem;
        margin-top: 0.125rem;
        object-fit: contain;
    }

    .resource-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
    }

    .resource-title {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--ff-grey-900);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .resource-url {
        font-size: 0.75rem;
        color: var(--ff-grey-50)0;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>
