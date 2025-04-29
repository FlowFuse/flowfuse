<template>
    <main v-if="!pipeline?.id">
        <ff-loading message="Loading Pipeline..." />
    </main>
    <div v-else class="flex flex-col sm:flex-row">
        <router-view
            :application="application"
            :applicationDevices="devices"
            :instances="instances"
            :deviceGroups="deviceGroups"
            :pipeline="pipeline"
        />
    </div>
</template>

<script>
import ApplicationApi from '../../../api/application.js'
import usePermissions from '../../../composables/Permissions.js'
import Alerts from '../../../services/alerts.js'

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
        }
    },
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data: function () {
        return {
            pipeline: null,
            devices: [],
            deviceGroups: []
        }
    },
    watch: {
        'application.id': 'fetchData',
        '$route.params.pipelineId': 'fetchData'
    },
    async created () {
        if (this.hasPermission('application:pipeline:list')) {
            await this.fetchData()
        } else {
            return this.$router.push({ name: 'Application', params: this.$route.params })
        }
    },
    methods: {
        async loadPipeline () {
            if (!this.application.id) {
                return Promise.resolve()
            }

            return ApplicationApi.getPipeline(this.application.id, this.$route.params.pipelineId)
                .then(res => {
                    this.pipeline = res
                })
        },
        async fetchData () {
            try {
                await this.loadPipeline()
            } catch (err) {
                this.notFound()
            }

            try {
                this.devices = (await ApplicationApi.getApplicationDevices(this.application.id)).devices
            } catch (err) {
                this.devices = []
                Alerts.emit('Failed to load Remote Instances', 'warning')
            }
            try {
                this.deviceGroups = (await ApplicationApi.getDeviceGroups(this.application.id)).groups
            } catch (err) {
                if (err.request.status === 404) {
                    // if feature is unavailable for this Team Type, this returns a 404, but we need to handle cleanly
                    this.deviceGroups = []
                } else {
                    Alerts.emit('Failed to load Device Groups', 'warning')
                }
            }
        },
        notFound () {
            this.$router.push({
                name: 'page-not-found',
                params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                // preserve existing query and hash if any
                query: this.$router.currentRoute.value.query,
                hash: this.$router.currentRoute.value.hash
            })
        }
    }
}
</script>
