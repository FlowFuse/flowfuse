<template>
    <div class="ff-project-overview space-y-4">
        <div class="max-w-3xl">
            <div class="ff-instance-info">
                <FormHeading><RectangleGroupIcon />{{ $t('ui.teamInfo') }}</FormHeading>

                <table class="table-fixed w-full border border-separate rounded-sm">
                    <tbody>
                        <tr class="border-b">
                            <td class="w-40 font-medium">{{ $t('ui.name') }}</td>
                            <td>
                                <span v-if="!editing">{{ input.teamName }} </span>
                                <FormRow v-else id="teamName" ref="name-row" v-model="input.teamName" type="text" :error="errors.teamName" class="mt-2 mb-6">
                                    <template #description>
                                        <div v-if="editing">{{ $t('ui.egDevelopment') }}</div>
                                    </template>
                                </FormRow>
                            </td>
                        </tr>
                        <tr class="border-b">
                            <td class="w-40 font-medium">{{ $t('ui.type') }}</td>
                            <td class="flex flex-row items-center">
                                <span class="grow">{{ input.teamType }} </span>
                                <ff-button v-if="!team.suspended" kind="secondary" size="small" :to="{name: 'team-change-type'}">{{ $t('ui.changeTeamType') }}</ff-button>
                            </td>
                        </tr>
                        <tr class="border-b">
                            <td class="w-40 font-medium">{{ $t('ui.url2') }}</td>
                            <td>
                                <span v-if="!editing">{{ teamUrl }}</span>
                                <FormRow v-else id="teamName" ref="name-row" v-model="input.slug" type="text" :error="errors.slug" class="mt-2 mb-6">
                                    <template #description>
                                        <span class="text-red-700">{{ $t('ui.warning') }}</span>
                                        {{ $t('ui.changingThisWillModifyAllUrlsUsedToAccessTheTeam') }}
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
                            <td class="w-40 font-medium">{{ $t('ui.sso') }}<SparklesIcon class="ff-icon ff-icon-sm mr-2" style="stroke-width: 1px;" /></td>
                            <td>
                                <span><a href="https://flowfuse.com/support/" target="_blank" class="underline">{{ $t('ui.contactUsToEnableSsoForYourTeamSUsers') }}</a></span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <div v-if="!team.suspended" class="space-x-4 whitespace-nowrap">
        <template v-if="!editing">
            <ff-button kind="primary" @click="editName">{{ $t('ui.editTeamSettings') }}</ff-button>
        </template>
        <template v-else>
            <div class="flex gap-x-3">
                <ff-button kind="secondary" @click="cancelEditName">{{ $t('ui.cancel') }}</ff-button>
                <ff-button kind="primary" :disabled="!formValid" @click="saveEditName">{{ $t('ui.saveTeamSettings') }}</ff-button>
            </div>
        </template>
    </div>
</template>

<script>

import { RectangleGroupIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import teamApi from '../../../api/team.js'
import teamsApi from '../../../api/teams.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import { t } from '../../../i18n.js'
import alerts from '../../../services/alerts.js'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmTeamsStore } from '@/stores/data-farm-teams'

export default {
    name: 'TeamSettingsGeneral',
    components: {
        FormHeading,
        FormRow,
        SparklesIcon,
        RectangleGroupIcon
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
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['features']),
        ...mapState(useAccountAuthStore, ['user']),
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
                this.errors.slug = t('ui.mustNotBeBlank')
            } else if (!/^[a-z0-9-_]+$/i.test(v)) {
                this.errors.slug = t('ui.mustOnlyContainAZ09')
            } else {
                this.checkSlug()
                this.errors.slug = ''
            }
        },
        'input.teamName': function (v) {
            if (v && /:\/\//.test(v)) {
                this.errors.teamName = t('ui.teamNameCanNotContainUrl')
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
                await useDataFarmTeamsStore().fetchTeamList()
                await useContextStore().refreshTeam()
                alerts.emit(t('ui.teamSettingsUpdated'), 'confirmation')
            }).catch(err => {
                if (err.response.data) {
                    if (/slug/.test(err.response.data.error)) {
                        this.errors.slug = t('ui.slugAlreadyInUse')
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
                            this.errors.slug = t('ui.slugUnavailable')
                        }
                    })
                }
            }, 200)
        }
    }
}
</script>
