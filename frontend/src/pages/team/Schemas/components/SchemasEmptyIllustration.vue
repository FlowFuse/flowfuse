<template>
    <!-- Inline rather than an image file, so its colours come from the theme -->
    <svg class="schemas-illustration" xmlns="http://www.w3.org/2000/svg" width="216" height="216" viewBox="0 0 216 216" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <!-- braces badge -->
        <circle class="accent" cx="178" cy="52" r="22" stroke-width="1.5" stroke-dasharray="4 4" />
        <path class="accent" d="M173 40q-5 0-5 5v3.5q0 3.5-3.5 3.5q3.5 0 3.5 3.5V59q0 5 5 5" stroke-width="2" />
        <path class="accent" d="M183 40q5 0 5 5v3.5q0 3.5 3.5 3.5q-3.5 0-3.5 3.5V59q0 5-5 5" stroke-width="2" />
        <circle class="accent-fill" cx="178" cy="52" r="1.6" />

        <!-- main schema card -->
        <rect class="card" x="16" y="36" width="120" height="152" rx="8" />
        <path class="band" d="M16 62V44a8 8 0 0 1 8-8h104a8 8 0 0 1 8 8v18z" />
        <path class="on-band" d="M28 49h52M104 49h18" stroke-width="4" />
        <path class="divider" d="M16 87h120M16 112h120M16 137h120M16 162h120" stroke-width="1.5" />
        <rect class="stroke band" x="26" y="70.5" width="8" height="8" rx="2" stroke-width="1.5" />
        <rect class="stroke" x="26" y="95.5" width="8" height="8" rx="2" stroke-width="1.5" />
        <rect class="stroke" x="26" y="120.5" width="8" height="8" rx="2" stroke-width="1.5" />
        <rect class="stroke" x="26" y="145.5" width="8" height="8" rx="2" stroke-width="1.5" />
        <rect class="stroke" x="26" y="170.5" width="8" height="8" rx="2" stroke-width="1.5" />
        <path class="line" d="M44 74.5h40M44 99.5h52M44 124.5h32M44 149.5h46M44 174.5h28" stroke-width="4" />
        <path class="stroke" d="M106 74.5h16M110 99.5h12M102 124.5h20M108 149.5h14M104 174.5h18" stroke-width="4" />
        <rect class="stroke" x="16" y="36" width="120" height="152" rx="8" stroke-width="2" />

        <!-- connector -->
        <path class="stroke" d="M141 99.5h20q18 0 18 10" stroke-width="1.5" stroke-dasharray="4 4" />
        <rect class="card stroke" x="131" y="94.5" width="10" height="10" rx="2.5" stroke-width="2" />

        <!-- related schema (ghost) -->
        <rect class="card stroke" x="156" y="114" width="46" height="74" rx="6" stroke-width="1.5" stroke-dasharray="4 4" />
        <path class="stroke" d="M175 109l4 4 4-4" stroke-width="1.5" />
        <path class="line" d="M164 125h22" stroke-width="4" />
        <path class="divider" d="M160 134h38" stroke-width="1.5" />
        <path class="line" d="M164 146h26M164 161h18M164 176h24" stroke-width="3.5" />

        <!-- corner anchor -->
        <path class="stroke" d="M30 188v4q0 8-8 8h-2" stroke-width="1.5" />
        <rect class="card stroke" x="13" y="196.5" width="7" height="7" rx="1.5" transform="rotate(45 16.5 200)" stroke-width="1.5" />
    </svg>
</template>

<script setup lang="ts">
defineOptions({ name: 'SchemasEmptyIllustration' })
</script>

<style scoped lang="scss">
.schemas-illustration {
    // the empty state centres an img, not an svg
    margin: 0 auto;

    --illustration-card: var(--ff-color-bg-app);
    --illustration-band: var(--ff-color-bg-emphasis);
    --illustration-line: var(--ff-color-border);
    --illustration-stroke: var(--ff-color-border-strong);
    --illustration-accent: var(--ff-color-text-subtle);

    .card { fill: var(--illustration-card); }
    .band { fill: var(--illustration-band); }
    .on-band { stroke: var(--illustration-card); }
    .divider { stroke: var(--illustration-band); }
    .line { stroke: var(--illustration-line); }
    .stroke { stroke: var(--illustration-stroke); }
    .accent { stroke: var(--illustration-accent); }
    .accent-fill { fill: var(--illustration-accent); }
}

// on a dark page the card is raised off the background, and its outline and details are a step stronger
:global([data-theme="dark"]) .schemas-illustration {
    --illustration-card: var(--ff-color-bg-surface-raised);
    --illustration-line: var(--ff-color-border-strong);
    --illustration-stroke: var(--ff-color-text-disabled);
}
</style>
