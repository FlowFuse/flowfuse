<template>
    <main v-if="!pipeline?.id">
        <ff-loading message="Loading Pipeline..." />
    </main>
    <div v-else class="flex flex-col sm:flex-row">
        <router-view
            :application="application"
            :applicationDevices="devices"
            :instances="instances"
            :pipeline="pipeline"
        />
    </div>
</template>

<script>
import ApplicationApi from '../../../api/application.js'

export default {
    name: 'PipelineIndex',
    inheritAttrs: false,
    props: {
        application: {
            type: Object,
            required: true
        },
        instances: {
            type: Object,
            required: true
        },
        devices: {
            type: Array,
            required: true
        }
    },
    data: function () {
        return {
            pipeline: null
        }
    },
    watch: {
        'application.id': 'loadPipeline'
    },
    created () {
        this.loadPipeline()

        this.$watch(
            () => this.$route.params.pipelineId,
            () => {
                if (!this.$route.params.pipelineId) {
                    return
                }

                this.loadPipeline()
            }
        )
    },
    methods: {
        async loadPipeline () {
            if (!this.application.id) {
                return
            }

            try {
                this.pipeline = await ApplicationApi.getPipeline(this.application.id, this.$route.params.pipelineId)
            } catch (err) {
                this.$router.push({
                    name: 'PageNotFound',
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash
                })
            }
        }
    }
}
</script>
