<template>
    <form class="space-y-6">
        <FormRow v-model="teamId" type="uneditable" id="teamId" ref="id-row">
            <template #default>Team ID</template>
        </FormRow>
        <FormRow v-model="input.teamName" :type="editing ? 'text' : 'uneditable'" :error="errors.teamName" id="teamName" ref="name-row">
            <template #default>Name</template>
            <template #description>
                <div v-if="editing">eg. 'Development'</div>
            </template>
        </FormRow>
        <FormRow v-model="input.teamType" type="uneditable">
            <template #default>Type</template>
            <template #description>
                <div v-if="editing">You cannot currently change the type of team</div>
            </template>
        </FormRow>
        <FormRow v-model="input.slug" :type="editing ? 'text' : 'uneditable'" :error="errors.slug" id="teamSlug">
            <template #default>Slug</template>
            <template #description>
                <div v-if="editing">
                    <span class="text-red-700">Warning:</span>
                    Changing this will modify all urls used to access the team.
                    The platform will not redirect requests to the old url.
                    <br/>
                    <br/>
                    <pre>/team/&lt;slug&gt;</pre>
                </div>
            </template>
        </FormRow>

        <div class="space-x-4 whitespace-nowrap">
            <template v-if="!editing">
                <ff-button kind="primary" size="small" @click="editName">Edit team settings</ff-button>
            </template>
            <template v-else>
                <div class="flex gap-x-3">
                    <ff-button kind="secondary" size="small" @click="cancelEditName">Cancel</ff-button>
                    <ff-button kind="primary" size="small" :disabled="!formValid" @click="saveEditName">Save team settings</ff-button>
                </div>
            </template>
        </div>
    </form>
</template>

<script>
import alerts from '@/services/alerts'

import teamApi from '@/api/team'
import FormRow from '@/components/FormRow'

export default {
    name: 'TeamSettingsGeneral',
    props: ['team'],
    data () {
        return {
            errors: {
                teamName: '',
                slug: ''
            },
            editing: false,
            input: {
                slug: '',
                teamName: '',
                teamType: ''
            }
        }
    },
    watch: {
        team: 'fetchData',
        'input.slug': function (v) {
            if (!v) {
                this.errors.slug = 'Must not be blank'
            } else if (!/^[a-z0-9-_]+$/i.test(v)) {
                this.errors.slug = 'Must only contain a-z 0-9 - _'
            } else {
                this.errors.slug = ''
            }
        },
        'input.teamName': function (v) {
            if (v && /:\/\//.test(v)) {
                this.errors.teamName = 'Team name can not contain URL'
            } else {
                this.errors.teamName = ''
            }
        }
    },
    computed: {
        formValid () {
            return this.input.teamName && !this.errors.slug && !this.errors.teamName
        },
        teamId () {
            return this.team.id
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        editName () {
            this.editing = true
            this.$refs['name-row'].focus()
        },
        async saveEditName () {
            let changed = false
            const options = {}
            if (this.input.teamName !== this.team.name) {
                options.name = this.input.teamName
                changed = true
            }
            if (this.input.slug !== this.team.slug) {
                options.slug = this.input.slug
                changed = true
            }

            if (!changed) {
                this.cancelEditName()
                return
            }

            teamApi.updateTeam(this.team.id, options).then(async result => {
                this.editing = false
                await this.$store.dispatch('account/refreshTeams')
                await this.$store.dispatch('account/refreshTeam')
                alerts.emit('Team Settings updated.', 'confirmation')
            }).catch(err => {
                if (err.response.data) {
                    if (/slug/.test(err.response.data.error)) {
                        this.errors.slug = 'Slug already in use'
                    }
                }
            })
        },
        cancelEditName () {
            this.editing = false
            this.input.teamName = this.team.name
            this.input.slug = this.team.slug
            this.input.teamType = this.team.type.name
        },

        async fetchData () {
            this.cancelEditName()
        }
    },
    components: {
        FormRow
    }
}
</script>
