<template>
    <div class="forge-block">
        <div class="max-w-2xl m-auto">
            <form class="space-y-6">
                <FormHeading>Create a new team</FormHeading>
                <div class="mb-8 text-sm text-gray-500">Teams are how you organize who collaborates on your projects.</div>

                <FormRow v-model="input.name" id="team">Team Name
                    <template v-slot:description>
                        eg. 'Development'
                    </template>
                </FormRow>

                <FormRow v-model="input.slug" id="team" :error="input.slugError" :placeholder="input.defaultSlug">URL Slug
                    <template v-slot:description>
                        Use the default slug based on the team name or set your own.<br/>
                        <code>/team/&lt;slug&gt;</code>
                    </template>
                </FormRow>

                <button type="button" :disabled="!formValid" @click="createTeam" class="forge-button">
                    Create team
                </button>
            </form>
        </div>
    </div>
</template>

<script>
import teamApi from '@/api/team'
import slugify from '@/utils/slugify'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs'

export default {
    name: 'CreateTeam',
    mixins: [Breadcrumbs],
    data() {
        return {
            teams: [],
            input: {
                name: "",
                slug: "",
                defaultSlug: "",
                slugError: ""
            }
        }
    },
    created() {
        this.clearBreadcrumbs();
    },
    watch: {
        'input.name': function() {
            this.input.defaultSlug = slugify(this.input.name);
        },
        'input.slug': function(v) {
            if (v && !/^[a-z0-9-_]+$/i.test(v)) {
                this.input.slugError = "Must only contain a-z 0-9 - _"
            } else {
                this.input.slugError = ""
            }
        }
    },
    computed: {
        formValid() {
            return this.input.name && !this.input.slugError
        }
    },
    methods: {
        createTeam() {
            const opts = {
                name: this.input.name,
                slug: this.input.slug || this.input.defaultSlug
            }

            teamApi.create(this.input).then(result => {
                this.$store.dispatch('account/refreshTeams');
                this.$store.dispatch('account/setTeam',result);
                this.$router.push({name:"Team",params:{id: result.slug}})
            }).catch(err => {
                if (err.response.data) {
                    if (/slug/.test(err.response.data.error)) {
                        this.input.slugError = "Slug already in use"
                    }
                }
            });
        },
        refreshName() {
            this.input.name = NameGenerator()
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
