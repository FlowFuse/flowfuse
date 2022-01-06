<template>
    <form class="space-y-6">
        <FormRow v-model="input.teamName" :type="editing.teamName?'text':'uneditable'" :error="errors.teamName" id="teamName">
            <template #default>Name</template>
            <template #description>
                <div v-if="editing.teamName">eg. 'Development'</div>
            </template>
        </FormRow>
        <FormRow v-model="input.slug" :type="editing.teamName?'text':'uneditable'" :error="errors.slug" id="teamSlug">
            <template #default>Slug</template>
            <template #description>
                <div v-if="editing.teamName">
                <span class="text-red-700">Warning:</span>
                Changing this will modify all urls used to access the team.
                The platform will not redirect requests to the old url.<br/>
                <code>/team/&lt;slug&gt;</code>
                </div>
            </template>
        </FormRow>

        <div class="space-x-4 whitespace-nowrap">
            <template v-if="!editing.teamName">
                <button type="button" class="forge-button forge-button-small" @click="editName">Edit team settings</button>
            </template>
            <template v-else>
                <button type="button" class="forge-button-tertiary forge-button-small" @click="cancelEditName">Cancel</button>
                <button type="button" :disabled="!formValid" class="forge-button forge-button-small" @click="saveEditName">Save team settings</button>
            </template>
        </div>

    </form>
</template>

<script>
import teamApi from '@/api/team'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

export default {
    name: 'TeamSettingsGeneral',
    props:[ "team" ],
    data() {
        return {
            errors: {
                teamName: "",
                slug: "",
            },
            editing: {
                teamName: false,
            },
            input: {
                slug:"",
                teamName: "",
            }
        }
    },
    watch: {
        team: 'fetchData',
        'input.slug': function(v) {
            if (!v) {
                this.errors.slug = "Must not be blank"
            } else if (!/^[a-z0-9-_]+$/i.test(v)) {
                this.errors.slug = "Must only contain a-z 0-9 - _"
            } else {
                this.errors.slug = ""
            }
        }
    },
    computed: {
        formValid() {
            return this.input.teamName && !this.errors.slug
        }
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        editName() {
            this.editing.teamName = true
            setTimeout(() => {
                document.getElementById("teamName").focus()
            },0)
        },
        async saveEditName() {
            let changed = false;
            const options  = {};
            if (this.input.teamName != this.team.name) {
                options.name = this.input.teamName;
                changed = true;
            }
            if (this.input.slug != this.team.slug) {
                options.slug = this.input.slug
                changed = true;
            }

            if (!changed) {
                this.cancelEditName();
                return;
            }

            teamApi.updateTeam(this.team.id, options).then(async result => {
                this.editing.teamName = false;
                await this.$store.dispatch('account/refreshTeams');
                await this.$store.dispatch('account/refreshTeam');
            }).catch(err => {
                if (err.response.data) {
                    if (/slug/.test(err.response.data.error)) {
                        this.errors.slug = "Slug already in use"
                    }
                }
            });
        },
        cancelEditName() {
            this.editing.teamName = false
            this.input.teamName = this.team.name;
            this.input.slug = this.team.slug;
        },

        async fetchData () {
            this.cancelEditName();
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
