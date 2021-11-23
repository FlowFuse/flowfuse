<template>
    <form class="space-y-6">
        <FormRow v-model="input.projectName" id="projectName">Name</FormRow>
    </form>
</template>

<script>
import projectApi from '@/api/project'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'


export default {
    name: 'ProjectSettings',

    props:[ "project" ],
    data() {
        return {
            input: {
                projectName: ""
            }
        }
    },
    watch: {
         project: 'fetchData'
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        fetchData () {
            this.input.projectName = this.project.name;
        }
    },
    components: {
        FormRow,
        FormHeading,
    }
}
</script>
