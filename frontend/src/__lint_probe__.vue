<!-- PROBE FILE — deliberate lint violations for testing scripts/lint-colors.js. DELETE ME. -->
<template>
    <!-- Check 2: banned Tailwind utility classes in templates -->
    <div class="bg-black">probe: bg-black</div>
    <div class="text-red-50">probe: text-red-50</div>
    <div class="text-gray-100">probe: text-gray-100</div>
    <div class="text-yellow-200">probe: text-yellow-200</div>

    <!-- Check 1: hex literal in a color property -->
    <span style="color: #374151;">probe: hex literal</span>

    <!-- Check 1: named color keyword in a color property -->
    <span style="background: white;">probe: named color</span>

    <!-- Check 1: banned SVG fill/stroke attributes -->
    <svg>
        <rect fill="#ff0000" />
        <rect stroke="red" />
        <rect fill="var(--ff-palette-grey-700)" />
    </svg>
</template>
