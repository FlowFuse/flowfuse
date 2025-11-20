<template>
    <div class="ff-expert-rich-guide">
        <!-- Setup Guide Badge -->
        <div class="guide-badge">
            <span>Setup Guide</span>
        </div>

        <!-- Title and Summary -->
        <div class="guide-header">
            <h3 class="guide-title">{{ guide.title }}</h3>
            <p v-if="guide.summary" class="guide-summary">{{ guide.summary }}</p>
        </div>

        <!-- Steps Section -->
        <div v-if="guide.steps && guide.steps.length > 0" class="guide-steps">
            <h4 class="section-title">Steps:</h4>
            <ol class="steps-list">
                <li v-for="(step, index) in guide.steps" :key="index" class="step-item">
                    <div class="step-number">{{ index + 1 }}</div>
                    <div class="step-content">
                        <h5 class="step-title">{{ step.title }}</h5>
                        <p class="step-detail">{{ step.detail }}</p>
                    </div>
                </li>
            </ol>
        </div>

        <section class="flex flex-col gap-4">
            <!-- Node Packages Section -->
            <div v-if="guide.nodePackages && guide.nodePackages.length > 0" class="guide-packages">
                <h4 class="section-title">Required Node Packages</h4>
                <div class="packages-grid">
                    <PackageResourceCard v-for="(pkg, index) in guide.nodePackages" :key="index" :nodePackage="pkg" />
                </div>
            </div>

            <!-- Resources Section -->
            <div v-if="guide.resources && guide.resources.length > 0" class="guide-resources">
                <h4 class="section-title">Related Resources</h4>
                <div class="resources-grid">
                    <StandardResourceCard v-for="(resource, index) in guide.resources" :key="index" :resource="resource" />
                </div>
            </div>

            <!-- Resources Section -->
            <div v-if="guide.flows && guide.flows.length > 0" class="guide-flows">
                <h4 class="section-title">Related Flows</h4>
                <div class="resources-grid">
                    <FlowResourceCard v-for="(flow, index) in guide.flows" :key="index" :flow="flow" />
                </div>
            </div>
        </section>
    </div>
</template>

<script>
import FlowResourceCard from './resources/FlowResourceCard.vue'
import PackageResourceCard from './resources/PackageResourceCard.vue'
import StandardResourceCard from './resources/StandardResourceCard.vue'

export default {
    name: 'ExpertRichGuide',
    components: { StandardResourceCard, PackageResourceCard, FlowResourceCard },
    props: {
        message: {
            type: Object,
            required: true,
            validator: (message) => {
                return message.guide?.title !== undefined
            }
        }
    },
    computed: {
        guide () {
            return this.message.guide
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-rich-guide {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.guide-badge {
    display: inline-flex;
    align-self: flex-start;
    margin-bottom: 0.75rem; // mb-3

    span {
        display: inline-block;
        padding: 0.5rem 0.75rem; // py-2 px-3
        background-color: $ff-indigo-100;
        color: $ff-indigo-700;
        font-size: 0.875rem; // text-sm
        border-radius: 9999px; // rounded-full
    }
}

.guide-header {
    .guide-title {
        font-size: 1.125rem; // text-lg
        font-weight: 600; // font-semibold
        color: #111827; // text-gray-900
        margin: 0 0 0.5rem 0; // mb-2
    }

    .guide-summary {
        color: #374151; // text-gray-700
        margin: 0 0 1rem 0; // mb-4
        line-height: 1.625;
    }
}

.section-title {
    font-size: 1rem; // text-base
    font-weight: 500; // font-medium
    color: #111827; // text-gray-900
    margin: 0 0 0.75rem 0; // mb-3
}

.guide-steps {
    margin-bottom: 1rem; // mb-4

    .steps-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem; // space-y-3
    }

    .step-item {
        display: flex;
        align-items: flex-start;
    }

    .step-number {
        flex-shrink: 0;
        width: 1.5rem; // w-6
        height: 1.5rem; // h-6
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: $ff-indigo-600;
        color: white;
        font-size: 0.875rem; // text-sm
        border-radius: 50%; // rounded-full
        margin-right: 0.75rem; // mr-3
        margin-top: 0.125rem; // mt-0.5
    }

    .step-content {
        flex: 1;

        .step-title {
            font-size: 1rem;
            font-weight: 500;
            color: $ff-grey-900;
            margin: 0 0 0.25rem 0;
        }

        .step-detail {
            font-size: 0.875rem;
            color: $ff-grey-600;
            margin: 0.25rem 0 0 0;
            line-height: 1.5;
        }
    }
}

.guide-packages {
    .packages-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.5rem;
    }
}

.guide-resources {
    .resources-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
}

.guide-flows {
    .resources-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
}
</style>
