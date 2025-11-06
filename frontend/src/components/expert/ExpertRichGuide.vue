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

        <!-- Node Packages Section -->
        <div v-if="guide.nodePackages && guide.nodePackages.length > 0" class="guide-packages">
            <h4 class="section-title">Required Node Packages</h4>
            <div class="packages-grid">
                <a
                    v-for="(pkg, index) in guide.nodePackages"
                    :key="index"
                    :href="addUTMTracking(getPackageUrl(pkg))"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="package-card"
                >
                    <img
                        :src="'https://www.google.com/s2/favicons?domain=flows.nodered.org'"
                        alt="Node-RED"
                        class="package-favicon"
                        @error="handleImageError"
                    >
                    <div class="package-info">
                        <div class="package-name">{{ getPackageName(pkg) }}</div>
                        <div class="package-url">{{ getPackageUrl(pkg) }}</div>
                    </div>
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
                        :src="getFaviconUrl(resource.url)"
                        :alt="resource.type"
                        class="resource-icon"
                        @error="handleImageError"
                    >
                    <div class="resource-info">
                        <div class="resource-title">{{ resource.title }}</div>
                        <div class="resource-url">{{ resource.url }}</div>
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
        getPackageName (pkg) {
            // Handle both object format {name: "..."} and string format
            return typeof pkg === 'object' ? pkg.name : pkg
        },
        getPackageUrl (pkg) {
            const packageName = this.getPackageName(pkg)
            return `https://flows.nodered.org/node/${packageName}`
        },
        getFaviconUrl (url) {
            try {
                const urlObj = new URL(url)
                return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`
            } catch (e) {
                // If URL parsing fails, return empty string to trigger error handler
                return ''
            }
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
    gap: 0;
}

.guide-badge {
    display: inline-flex;
    align-self: flex-start;
    margin-bottom: 0.75rem; // mb-3

    span {
        display: inline-block;
        padding: 0.5rem 0.75rem; // py-2 px-3
        background-color: #EEF2FF; // bg-indigo-100
        color: #4338CA; // text-indigo-700
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

    .package-card {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background-color: white;
        border: 1px solid $ff-grey-200;
        border-radius: 0.5rem;
        text-decoration: none;
        color: $ff-grey-900;
        transition: all 0.2s ease;
        height: 4rem;

        &:hover {
            border-color: $ff-indigo-300;
            background-color: $ff-grey-50;
        }
    }

    .package-favicon {
        flex-shrink: 0;
        width: 1rem;
        height: 1rem;
    }

    .package-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .package-name {
        font-size: 0.875rem;
        font-weight: 500;
        font-family: monospace;
        color: $ff-grey-900;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .package-url {
        font-size: 0.75rem;
        color: $ff-grey-500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin: 0;
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
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.75rem;
        background-color: white;
        border: 1px solid $ff-grey-200;
        border-radius: 0.5rem;
        text-decoration: none;
        color: $ff-grey-900;
        transition: all 0.2s ease;

        &:hover {
            border-color: $ff-indigo-300;
            background-color: $ff-grey-50;
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
        color: $ff-grey-900;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .resource-url {
        font-size: 0.75rem;
        color: $ff-grey-500;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>
