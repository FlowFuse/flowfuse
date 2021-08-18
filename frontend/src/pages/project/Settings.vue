<template>
    <form class="space-y-6">
        <FormHeading>Project Settings</FormHeading>
        <FormRow v-model="input.projectName" id="projectName">Name</FormRow>
    </form>
</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'ProjectSettings',
    mixins: [Breadcrumbs],
    props:[ "project" ],
    data() {
        return {
            input: {
                projectName: ""
            }
        }
    },
    created() {
        this.replaceLastBreadcrumb({ label:"Settings" })
    },
    watch: {
         team: 'fetchData'
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
        FormHeading
    }
}
</script>
