<template>
    <h1>Hello World</h1>
</template>

<script>
import ApplicationsApi from '../../api/application.js'
export default {
    name: 'ApplicationDependencies',
    props: {
        application: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            payload: []
        }
    },
    mounted () {
        ApplicationsApi.getDependencies(this.application.id)
            .then(res => {
                this.payload = res
            })
            .catch(err => console.warn(err))
    }
}
</script>

<style scoped lang="scss">

</style>
