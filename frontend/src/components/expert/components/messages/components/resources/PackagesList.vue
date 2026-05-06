<template>
    <div class="guide-packages">
        <h4 class="section-title">
            <streamable-content v-model="packagesTitle" :should-stream="shouldStream" />
        </h4>
        <div v-if="!shouldStream || packagesTitle.streamed" class="packages-list">
            <PackageResourceCard
                v-for="(node, index) in visibleItems" :key="index"
                :nodePackage="node"
                :should-stream="shouldStream"
                @streaming-complete="updateCardStreamingState(node, index)"
            />
        </div>
    </div>
</template>

<script>
import useStreamingList from '../../../../../../composables/StreamingListHelper.js'
import PackageResourceCard from '../resource-cards/PackageResourceCard.vue'

import StreamableContent from './StreamableContent.vue'

export default {
    name: 'ListPackages',
    components: { StreamableContent, PackageResourceCard },
    props: {
        packages: {
            required: true,
            type: Array
        },
        shouldStream: {
            type: Boolean,
            default: false
        }
    },
    emits: ['streaming-complete'],
    setup () {
        const { initStreamer, updateCardStreamingState, visibleItems, items } = useStreamingList()

        return { initStreamer, updateCardStreamingState, visibleItems, items }
    },
    data () {
        return {
            packagesTitle: {
                streamable: 'Required Node Packages',
                streamed: false
            }
        }
    },
    async mounted () {
        const mappedPackages = this.packages.map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            title: pkg.title,
            url: pkg.url,
            type: pkg.type,
            metadata: pkg.metadata,
            hostname: pkg.hostname
        }))

        await this.initStreamer(mappedPackages, { shouldStream: this.shouldStream })

        this.$emit('streaming-complete')
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
    .packages-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
}
</style>
