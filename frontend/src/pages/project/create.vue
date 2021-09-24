<template>
    <div class="forge-block">
        <div class="max-w-2xl m-auto">
            <form class="space-y-6">
                <FormHeading>Create a new project</FormHeading>
                <div class="mb-8 text-sm text-gray-500">Let's get your new Node-RED instance setup in no time.</div>

                <FormRow :options="teams" v-model="input.team" id="team">Team</FormRow>

                <FormRow v-model="input.name">
                    <template v-slot:default>Project Name</template>
                    <template v-slot:append>
                        <button type="button" @click="refreshName" class="text-gray-500 hover:text-gray-600 border border-gray-300 hover:border-indigo-500 rounded ml-2 p-1 w-9 h-8" ><RefreshIcon class=" w-full" /></button>
                    </template>
                </FormRow>

                <!-- <FormRow v-model="input.description" id="description">Description</FormRow> -->

                <button type="button" @click="createProject" class="forge-button">
                    Create project
                </button>
            </form>
        </div>
    </div>
</template>

<script>
import teamApi from '@/api/team'
import projectApi from '@/api/project'

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import NameGenerator from '@/utils/name-generator'
import { RefreshIcon } from '@heroicons/vue/outline'
import Breadcrumbs from '@/mixins/Breadcrumbs'

export default {
    name: 'CreateProject',
    mixins: [Breadcrumbs],
    data() {
        return {
            currentTeam: null,
            teams: [],
            input: {
                name: NameGenerator(),
                team: "",
                // description: "",
                options: {
                    type: "basic"
                }
            }
        }
    },
    async created() {
        const data = await teamApi.getTeams()
        this.teamCount = data.count;
        this.teams = data.teams.map((t) => {
            if (t.slug === this.$router.currentRoute.value.params.id) {
                this.currentTeam = t.id;
            }
            return { value: t.id, label: t.name }
        });
        if (this.currentTeam == null) {
            this.currentTeam = this.teams[0].value;
        }
        this.clearBreadcrumbs();
        setTimeout(() => {
            // There must be a better Vue way of doing this, but I can't find it.
            // Without the setTimeout, the select box doesn't update
            this.input.team = this.currentTeam;
        },100);
    },
    methods: {
        createProject() {
            projectApi.create(this.input).then(result => {
                this.$router.push( { name: 'Project', params: { id: result.id }});
            }).catch(err => {
                console.log(err);
            });
        },
        refreshName() {
            this.input.name = NameGenerator()
        }
    },
    components: {
        FormRow,
        FormHeading,
        RefreshIcon
    }
}
</script>
