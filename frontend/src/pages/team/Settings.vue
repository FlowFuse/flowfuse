<template>
    <form class="space-y-6">
        <FormHeading>Team Settings</FormHeading>
        <FormRow v-model="input.teamName" id="teamName">Name</FormRow>
    </form>
</template>

<script>
import { mapState } from 'vuex'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

export default {
    name: 'TeamSettings',
    props:[ "team" ],
    data() {
        return {
            input: {
                teamName: ""
            }
        }
    },
    watch: {
         team: 'fetchData'
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        fetchData () {
            this.input.teamName = this.team.name;
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
