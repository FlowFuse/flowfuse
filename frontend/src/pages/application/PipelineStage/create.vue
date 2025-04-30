<template>
    <main>
        <PipelineStageForm
            :applicationDevices="applicationDevices"
            :instances="instances"
            :deviceGroups="deviceGroups"
            :pipeline="pipeline"
            :stage="{}"
            :sourceStage="$route.query.sourceStage"
            @submit="create"
        />
    </main>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import ApplicationAPI from '../../../api/application.js'
import PipelinesAPI from '../../../api/pipeline.js'
import usePermissions from '../../../composables/Permissions.js'

import Alerts from '../../../services/alerts.js'

import PipelineStageForm from './form.vue'

export default {
    name: 'CreatePipelineStage',
    components: {
        PipelineStageForm
    },
    inheritAttrs: false,
    props: {
        application: {
            type: Object,
            required: true
        },
        applicationDevices: {
            type: Array,
            required: true
        },
        instances: {
            type: Array,
            required: true
        },
        deviceGroups: {
            type: Array,
            default: () => []
        },
        pipeline: {
            type: Object,
            required: true
        }
    },
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    data () {
        return {
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            mounted: false
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    watch: {
        team: {
            immediate: true,
            handler (team) {
                if (team && !this.hasPermission('pipeline:create')) {
                    this.$router.replace({
                        name: 'ApplicationPipelines',
                        params: {
                            id: this.application.id
                        }
                    })
                }
            }
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        async create (input) {
            const options = {
                name: input.name,
                instanceId: input.instanceId,
                deviceId: input.deviceId,
                deployToDevices: input.deployToDevices,
                action: input.action
            }
            if (this.$route.query.sourceStage) {
                options.source = this.$route.query.sourceStage
            }

            // Set the device group, new, existing or null
            if (input.deviceGroupId === 'new') {
                try {
                    const result = await ApplicationAPI.createDeviceGroup(this.application.id, input.newDeviceGroup.name, input.newDeviceGroup.description)
                    options.deviceGroupId = result.id
                } catch (err) {
                    console.error(err)
                    Alerts.emit('Failed to create Device Group, stage was not created. Check the console for more details', 'error', 7500)
                    return
                }
            } else {
                options.deviceGroupId = input.deviceGroupId
            }

            if (input.gitTokenId) {
                // Git repo - clean up unused settings
                options.gitTokenId = input.gitTokenId
                options.url = input.url
                options.branch = input.branch
                options.credentialSecret = input.credentialSecret
            }

            await PipelinesAPI.addPipelineStage(this.pipeline.id, options)
            Alerts.emit('Pipeline stage successfully added.', 'confirmation')

            this.$router.push({
                name: 'ApplicationPipelines',
                params: {
                    id: this.application.id
                }
            })
        }
    }
}
</script>
