<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Pipelines">
                <template #context>
                    Manage your production and edge deployments using the DevOps Pipelines
                </template>
                <template #pictogram>
                    <img alt="info" src="../../../images/pictograms/pipeline_red.png">
                </template>
                <template #helptext>
                    <p>
                        DevOps Pipelines are used to link multiple Node-RED instances together in a deployment pipeline.
                    </p>
                    <p>
                        This is normally used to define "Development" instances, where you can test your new flows without fear or breaking "Production" environments.
                    </p>
                    <p>
                        Then, when you're ready, you could run a given stage of the pipeline to promote your instance to "Staging" or "Production".
                    </p>
                </template>
            </ff-page-header>
        </template>

        <router-view />
    </ff-page>
</template>

<script>
export default {
    name: 'TeamPipelines'
}
</script>

<style scoped lang="scss">

</style>
