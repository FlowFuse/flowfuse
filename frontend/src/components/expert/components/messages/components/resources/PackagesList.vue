<template>
    <div class="guide-packages">
        <h4 class="section-title">Required Node Packages</h4>
        <div class="packages-grid">
            <PackageResourceCard v-for="(node, index) in packages" :key="index" :nodePackage="node" />
        </div>
    </div>
</template>

<script>
import PackageResourceCard from '../resource-cards/PackageResourceCard.vue'

export default {
    name: 'ListPackages',
    components: { PackageResourceCard },
    props: {
        packages: {
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

.guide-packages {
    .packages-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.5rem;
    }
}
</style>
