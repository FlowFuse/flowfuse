<template>
    <div class="ff-project-overview space-y-4">
        <div class="max-w-3xl">
            <div class="ff-instance-info">
                <FormHeading><TemplateIcon />Team Info</FormHeading>

                <table class="table-fixed w-full border border-separate rounded">
                    <tr class="border-b">
                        <td class="w-40 font-medium">Name</td>
                        <td>
                            <span v-if="!editing">{{ input.teamName }} </span>
                            <FormRow v-else id="teamName" ref="name-row" v-model="input.teamName" type="text" :error="errors.teamName" class="mt-2 mb-6">
                                <template #description>
                                    <div v-if="editing">eg. 'Development'</div>
                                </template>
                            </FormRow>
                        </td>
                    </tr>
                    <tr class="border-b">
                        <td class="w-40 font-medium">Type</td>
                        <td class="flex flex-row items-center">
                            <span class="flex-grow">{{ input.teamType }} </span>
                            <ff-button kind="secondary" size="small" :to="{name: 'TeamChangeType'}">Change Team Type</ff-button>
                        </td>
                    </tr>
                    <tr class="border-b">
                        <td class="w-40 font-medium">URL</td>
                        <td>
                            <span v-if="!editing">{{ teamUrl }}</span>
                            <FormRow v-else id="teamName" ref="name-row" v-model="input.slug" type="text" :error="errors.slug" class="mt-2 mb-6">
                                <template #description>
                                    <span class="text-red-700">Warning:</span>
                                    Changing this will modify all urls used to access the team.
                                    The platform will not redirect requests to the old url.
                                    <br>
                                    <br>
                                    <pre>{{ teamUrl }}</pre>
                                </template>
                            </FormRow>
                        </td>
                    </tr>
                    <tr class="border-b">
                        <td class="w-40 font-medium">ID</td>
                        <td>
                            <span>{{ teamId }} </span>
                        </td>
                    </tr>
                    <tr v-if="ssoAvailable" class="border-b">
                        <td class="w-40 font-medium">SSO <SparklesIcon class="ff-icon ff-icon-sm mr-2" style="stroke-width: 1px;" /></td>
                        <td>
                            <span><a href="https://flowfuse.com/support/" target="_blank" class="underline">Contact us to enable SSO for your team's users</a></span>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    </div>
    <div class="space-x-4 whitespace-nowrap">
        <template v-if="!editing">
            <ff-button kind="primary" @click="editName">Edit team settings</ff-button>
        </template>
        <template v-else>
            <div class="flex gap-x-3">
                <ff-button kind="secondary" @click="cancelEditName">Cancel</ff-button>
                <ff-button kind="primary" :disabled="!formValid" @click="saveEditName">Save team settings</ff-button>
            </div>
        </template>
    </div>
</template>

<script>

import { SparklesIcon, TemplateIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import teamApi from '../../../api/team.js'
import teamsApi from '../../../api/teams.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import alerts from '../../../services/alerts.js'

export default {
    name: 'TeamSettingsGeneral',
    components: {
        FormHeading,
        FormRow,
        SparklesIcon,
        TemplateIcon
    },
    props: {
        team: {
            type: Object,
            required: true
        }
    },
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
            },
            pendingSlugCheck: null
        }
    },
    computed: {
        ...mapState('account', ['user', 'features']),
        formValid () {
            return this.input.teamName && !this.pendingSlugCheck && !this.errors.slug && !this.errors.teamName
        },
        teamId () {
            return this.team.id
        },
        slugValid () {
            return /^[a-z0-9-_]+$/i.test(this.input.slug)
        },
        teamUrl () {
            return `${document.location.origin}/team/${this.input.slug}`
        },
        ssoAvailable () {
            return this.features.sso && !this.user.sso_enabled && this.input.teamType === 'Enterprise'
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
                this.checkSlug()
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
        },
        checkSlug () {
            if (this.pendingSlugCheck) {
                clearTimeout(this.pendingSlugCheck)
            }
            this.pendingSlugCheck = setTimeout(() => {
                this.pendingSlugCheck = null
                if (this.input.slug && this.slugValid && this.input.slug !== this.team.slug) {
                    teamsApi.checkSlug(this.input.slug).then(() => {
                        if (this.slugValid) {
                            this.errors.slug = ''
                        }
                    }).catch(_ => {
                        if (this.slugValid) {
                            this.errors.slug = 'Slug unavailable'
                        }
                    })
                }
            }, 200)
        }
    }
}
</script>
