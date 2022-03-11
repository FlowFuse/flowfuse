<template>
    <div class="forge-block">
        <div class="max-w-2xl m-auto">
            <form class="space-y-6">
                <FormHeading>Create a new project</FormHeading>
                <div class="mb-8 text-sm text-gray-500">Let's get your new Node-RED instance setup in no time.</div>

                <FormRow :options="teams" :error="(init && (teams.length === 0))?'You do not have permission to create a project in any team':''" v-model="input.team" id="team">Team</FormRow>

                <FormRow v-model="input.name">
                    <template v-slot:default>Project Name</template>
                    <template v-slot:append>
                        <button type="button" @click="refreshName" class="forge-button-tertiary px-1" ><RefreshIcon class="w-5" /></button>
                    </template>
                </FormRow>

                <FormRow :options="stacks" :error="errors.stack" v-model="input.stack" id="stack">Stack</FormRow>

                <FormRow :options="templates" :error="errors.template" v-model="input.template" id="template">Template</FormRow>

                <!-- <FormRow v-model="input.description" id="description">Description</FormRow> -->

                <button type="button" :disabled="!createEnabled" @click="createProject" class="forge-button">
                    Create project
                </button>
            </form>
        </div>
    </div>
</template>

<script>
import teamApi from '@/api/team'
import projectApi from '@/api/project'
import stacksApi from '@/api/stacks'
import templatesApi from '@/api/templates'

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import NameGenerator from '@/utils/name-generator'
import { RefreshIcon } from '@heroicons/vue/outline'
import Breadcrumbs from '@/mixins/Breadcrumbs'
import { Roles } from '@core/lib/roles'

export default {
    name: 'CreateProject',
    mixins: [Breadcrumbs],
    data() {
        return {
            init: false,
            currentTeam: null,
            teams: [],
            stacks: [],
            templates: [],
            input: {
                name: NameGenerator(),
                team: "",
                stack: "",
                template: "",
                // description: "",
                options: {
                    type: "basic"
                }
            },
            errors: {
                stack: ''
            }
        }
    },
    computed: {
        createEnabled: function() {
            return this.input.stack && this.input.team && this.input.name &&  this.input.template
        }
    },
    async created() {
        const data = await teamApi.getTeams()
        const filteredTeams = [];

        data.teams.forEach((t) => {
            if (t.role !== Roles.Owner) {
                return
            }
            if (t.slug === this.$router.currentRoute.value.params.id) {
                this.currentTeam = t.id;
            }
            filteredTeams.push({ value: t.id, label: t.name })
        });

        if (this.currentTeam == null && filteredTeams.length > 0) {
            this.currentTeam = filteredTeams[0].value;
        }
        this.teams = filteredTeams;

        if (this.currentTeam) {
            this.setBreadcrumbs([
                { type: 'TeamLink'},
                { label: 'Create project' }
            ])
        }

        const stackList = await stacksApi.getStacks()
        this.stacks = stackList.stacks.filter(stack => stack.active).map(stack => { return { value: stack.id, label: stack.name } })

        const templateList = await templatesApi.getTemplates()
        this.templates = templateList.templates.map(template => { return { value: template.id, label: template.name } })


        this.init = true;
        setTimeout(() => {
            // There must be a better Vue way of doing this, but I can't find it.
            // Without the setTimeout, the select box doesn't update
            this.input.team = this.currentTeam
            this.input.stack = this.stacks.length > 0 ? this.stacks[0].value : ""
            this.input.template = this.templates.length > 0 ? this.templates[0].value : ""
            if (this.stacks.length === 0) {
                this.errors.stack = "No stacks available. Ask an Administator to create a new stack definition"
            }
            if (this.templates.length === 0) {
                this.errors.template = "No templates available. Ask an Administator to create a new template definition"
            }
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
