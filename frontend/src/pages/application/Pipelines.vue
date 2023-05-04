<template>
    <SectionTopMenu hero="DevOps Pipelines" help-header="FlowForge - DevOps Pipelines" info="Configure automated deployments between your Instances">
        <template #helptext>
            <p>This is a raw feed from the running instance of Node-RED on this domain.</p>
            <p>Use this to debug issues if your application will not start correctly.</p>
        </template>
        <template #tools>
            <ff-button :to="{name: 'CreatePipeline'}">
                <template #icon-left>
                    <PlusSmIcon />
                </template>
                Add Pipeline
            </ff-button>
        </template>
    </SectionTopMenu>

    <div v-if="pipelines?.length > 0">
        Pipelines go here
        {{ pipelines }}
    </div>
    <div v-else class="ff-no-data ff-no-data-large">
        Empty State for Pipelines
    </div>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'

import ApplicationAPI from '../../api/application.js'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

export default {
    name: 'ApplicationPipelines',
    components: {
        SectionTopMenu,
        PlusSmIcon
    },
    props: {
        instances: {
            type: Array,
            required: true
        }
    },
    data () {
        return {
            pipelines: []
        }
    },
    computed: {

    },
    mounted () {
        this.loadPipelines()
    },
    methods: {
        async loadPipelines () {
            ApplicationAPI.getPipelines(this.$route.params.id)
                .then((pipelines) => {
                    console.log(pipelines)
                    this.pipelines = pipelines
                })
                .catch((err) => {
                    console.log('err')
                    console.error(err)
                })
        }
    }
}
</script>
