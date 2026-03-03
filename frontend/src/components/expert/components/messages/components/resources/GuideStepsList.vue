<template>
    <div class="guide-steps">
        <h4 class="section-title">Steps:</h4>
        <ol class="steps-list">
            <li v-for="(step, index) in steps" :key="index" class="step-item">
                <div class="step-number">{{ index + 1 }}</div>
                <div class="step-content">
                    <h5 class="step-title">{{ step.title }}</h5>
                    <p class="step-detail">{{ step.detail }}</p>
                </div>
            </li>
        </ol>
    </div>
</template>

<script>
export default {
    name: 'ListGuideSteps',
    props: {
        steps: {
            required: true,
            type: Array
        }
    }
}
</script>

<style scoped lang="scss">
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

</style>
