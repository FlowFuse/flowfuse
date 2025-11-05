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
            <h4 class="section-title">Steps</h4>
            <ol class="steps-list">
                <li v-for="(step, index) in guide.steps" :key="index" class="step-item">
                    <div class="step-number">{{ index + 1 }}</div>
                    <div class="step-content" v-html="step" />
                </li>
            </ol>
        </div>

        <!-- Node Packages Section -->
        <div v-if="guide.nodePackages && guide.nodePackages.length > 0" class="guide-packages">
            <h4 class="section-title">Required Node Packages</h4>
            <div class="packages-grid">
                <a
                    v-for="(pkg, index) in guide.nodePackages"
                    :key="index"
                    :href="getPackageUrl(pkg)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="package-card"
                >
                    <div class="package-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <div class="package-name">{{ pkg }}</div>
                </a>
            </div>
        </div>

        <!-- Resources Section -->
        <div v-if="guide.resources && guide.resources.length > 0" class="guide-resources">
            <h4 class="section-title">Related Resources</h4>
            <div class="resources-grid">
                <a
                    v-for="(resource, index) in guide.resources"
                    :key="index"
                    :href="addUTMTracking(resource.url)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="resource-card"
                >
                    <img
                        v-if="resource.favicon"
                        :src="resource.favicon"
                        :alt="resource.type"
                        class="resource-icon"
                        @error="handleImageError"
                    >
                    <div v-else class="resource-icon-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div class="resource-info">
                        <div class="resource-type">{{ resource.type }}</div>
                        <div class="resource-title">{{ resource.title }}</div>
                    </div>
                </a>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ExpertRichGuide',
    props: {
        guide: {
            type: Object,
            required: true,
            validator: (guide) => {
                return guide.title !== undefined
            }
        }
    },
    methods: {
        getPackageUrl (packageName) {
            return `https://flows.nodered.org/node/${packageName}`
        },
        addUTMTracking (url) {
            try {
                const urlObj = new URL(url)
                urlObj.searchParams.set('utm_source', 'flowfuse-expert')
                urlObj.searchParams.set('utm_medium', 'assistant')
                urlObj.searchParams.set('utm_campaign', 'expert-chat')
                return urlObj.toString()
            } catch (e) {
                // If URL parsing fails, return original
                return url
            }
        },
        handleImageError (event) {
            // Hide broken image icon
            event.target.style.display = 'none'
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-rich-guide {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0.5rem 0;
}

.guide-badge {
    display: inline-flex;
    align-self: flex-start;

    span {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        background-color: $ff-indigo-600;
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-radius: 9999px;
    }
}

.guide-header {
    .guide-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: $ff-grey-900;
        margin: 0 0 0.5rem 0;
        line-height: 1.3;
    }

    .guide-summary {
        font-size: 0.9375rem;
        color: $ff-grey-700;
        margin: 0;
        line-height: 1.6;
    }
}

.section-title {
    font-size: 1rem;
    font-weight: 600;
    color: $ff-grey-900;
    margin: 0 0 0.75rem 0;
}

.guide-steps {
    .steps-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .step-item {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
    }

    .step-number {
        flex-shrink: 0;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: $ff-indigo-600;
        color: white;
        font-weight: 600;
        font-size: 0.875rem;
        border-radius: 50%;
    }

    .step-content {
        flex: 1;
        font-size: 0.9375rem;
        line-height: 1.6;
        color: $ff-grey-800;
        padding-top: 0.375rem;

        :deep(strong) {
            font-weight: 600;
        }

        :deep(code) {
            background-color: rgba(0, 0, 0, 0.05);
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            font-family: monospace;
            font-size: 0.875em;
        }

        :deep(a) {
            color: $ff-indigo-600;
            text-decoration: underline;

            &:hover {
                color: $ff-indigo-700;
            }
        }
    }
}

.guide-packages {
    .packages-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.75rem;
    }

    .package-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background-color: $ff-grey-50;
        border: 1px solid $ff-grey-200;
        border-radius: 0.5rem;
        text-decoration: none;
        color: $ff-grey-900;
        transition: all 0.2s ease;

        &:hover {
            background-color: white;
            border-color: $ff-indigo-300;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
    }

    .package-icon {
        flex-shrink: 0;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: $ff-indigo-600;

        svg {
            width: 1.5rem;
            height: 1.5rem;
        }
    }

    .package-name {
        font-size: 0.875rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.guide-resources {
    .resources-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .resource-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background-color: white;
        border: 1px solid $ff-grey-200;
        border-radius: 0.5rem;
        text-decoration: none;
        color: $ff-grey-900;
        transition: all 0.2s ease;

        &:hover {
            border-color: $ff-indigo-300;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
    }

    .resource-icon,
    .resource-icon-placeholder {
        flex-shrink: 0;
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .resource-icon {
        object-fit: contain;
    }

    .resource-icon-placeholder {
        color: $ff-grey-400;

        svg {
            width: 1.25rem;
            height: 1.25rem;
        }
    }

    .resource-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        min-width: 0;
    }

    .resource-type {
        font-size: 0.75rem;
        font-weight: 600;
        color: $ff-indigo-600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .resource-title {
        font-size: 0.875rem;
        font-weight: 500;
        color: $ff-grey-900;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>
