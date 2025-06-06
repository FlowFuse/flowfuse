<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Create New Team">
                <template #context>
                    Teams provide a way to organize who collaborates on your applications.
                </template>
            </ff-page-header>
        </template>
        <ff-loading v-if="redirecting" message="Redirecting to Stripe..." />
        <ff-loading v-else-if="loading" message="Creating Team..." />
        <div v-else :class="presetTeamType ? 'flex flex-col gap-4 sm:flex-row sm:gap-0' : 'space-y-6 mb-5'">
            <div v-if="presetTeamType" class="w-full">
                <team-type-tile class="m-auto" :team-type="presetTeamType" :enableCTA="false" />
            </div>
            <form>
                <!-- TeamType Type -->
                <div v-if="!presetTeamType" class="grid mb-3">
                    <ff-tile-selection v-model="input.teamTypeId">
                        <ff-tile-selection-option
                            v-for="(teamType, index) in teamTypes" :key="index"
                            :label="teamType.name" :description="teamType.description"
                            :price="billingEnabled ? teamType.billingPrice : ''"
                            :price-interval="billingEnabled ? teamType.billingInterval : ''"
                            :value="teamType.id"
                        />
                    </ff-tile-selection>
                </div>
                <div v-if="!isContactRequired" class="space-y-3">
                    <FormRow id="team" v-model="input.name" :error="errors.name" containerClass="max-w-md">
                        Team Name
                        <template #description>
                            eg. 'Development'
                        </template>
                    </FormRow>

                    <FormRow id="team" v-model="input.slug" :error="input.slugError" :placeholder="input.defaultSlug" containerClass="max-w-md">
                        URL Slug
                        <template #description>
                            Use the default slug based on the team name or set your own.<br>
                            <pre>/team/&lt;slug&gt;</pre>
                        </template>
                    </FormRow>

                    <template v-if="billingEnabled">
                        <div class="mb-8 text-sm text-gray-500 space-y-2">
                            <p v-if="(!presetTeamType && isBillingRequired) || (presetTeamType && !isSelectionTrial && !presetTeamType.isFree)">To create the team we need to setup payment details via Stripe, our secure payment provider.</p>
                        </div>
                        <ff-button v-if="isBillingRequired" :disabled="!formValid" @click="createTeam()">
                            <template #icon-right><ExternalLinkIcon /></template>
                            Create team and setup payment details
                        </ff-button>
                        <ff-button v-else-if="isSelectionTrial" :disabled="!formValid" @click="createTeam()">
                            Start Free Trial
                        </ff-button>
                        <ff-button v-else :disabled="!formValid" @click="createTeam()">
                            Create team
                        </ff-button>
                    </template>
                    <ff-button v-else :disabled="!formValid" @click="createTeam()">
                        <template v-if="billingEnabled && isSelectionTrial">Start Free Trial</template>
                        <template v-else>Create team</template>
                    </ff-button>
                </div>
                <template v-else>
                    <div class="mb-8 text-sm text-gray-500 space-y-2">
                        <p>To learn more about our {{ input.teamType?.name }} plan, click below to contact our sales team.</p>
                    </div>
                    <ff-button @click="sendContact()">
                        Talk to Sales
                    </ff-button>
                </template>
            </form>
        </div>
    </ff-page>
</template>

<script>
import { ChevronLeftIcon, ExternalLinkIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import teamApi from '../../api/team.js'
import teamTypesApi from '../../api/teamTypes.js'
import teamsApi from '../../api/teams.js'
import FormRow from '../../components/FormRow.vue'

import TeamTypeTile from '../../components/TeamTypeTile.vue'
import { useHubspotHelper } from '../../composables/Hubspot.js'
import slugify from '../../utils/slugify.js'

export default {
    name: 'CreateTeam',
    setup () {
        const { talkToSalesCalendarModal } = useHubspotHelper()

        return { talkToSalesCalendarModal }
    },
    data () {
        return {
            mounted: false,
            loading: false,
            redirecting: false,
            teamTypes: [],
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            input: {
                teamTypeId: '',
                teamType: null,
                name: '',
                slug: '',
                defaultSlug: '',
                slugError: ''
            },
            newTeam: null,
            errors: {},
            pendingSlugCheck: null,
            presetTeamType: false
        }
    },
    watch: {
        'input.name': function (v) {
            if (v && /:\/\//.test(v)) {
                this.errors.name = 'Team name can not contain URL'
            } else {
                this.errors.name = ''
            }
            this.input.slug = slugify(this.input.name)
        },
        'input.slug': function (v) {
            if (!v) {
                this.input.slugError = 'Must not be blank'
            } else if (!this.slugValid) {
                this.input.slugError = 'Must only contain a-z 0-9 - _'
            } else {
                this.checkSlug()
                this.input.slugError = ''
            }
        },
        'input.teamTypeId': function (v) {
            if (v) {
                this.input.teamType = this.teamTypes.find(tt => tt.id === v)
            } else {
                this.input.teamType = null
            }
        }
    },
    computed: {
        ...mapState('account', ['user', 'team', 'teams', 'features']),
        formValid () {
            return this.input.teamTypeId && this.input.name && this.input.slug && !this.pendingSlugCheck && !this.input.slugError && !this.errors.name
        },
        billingEnabled () {
            return this.features.billing
        },
        slugValid () {
            return /^[a-z0-9-_]+$/i.test(this.input.slug)
        },
        isContactRequired () {
            return this.billingEnabled &&
                   !this.user.admin &&
                   this.input.teamType && this.input.teamType.properties?.billing?.requireContact
        },
        isSelectionTrial () {
            // A team trial can be offered if:
            // 1. User has no other teams
            return this.teams.length === 0 &&
            // 2. User is less than a week old
                (Date.now() - (new Date(this.user.createdAt)).getTime()) < 1000 * 60 * 60 * 24 * 7 &&
            // 3. TeamType meta data says so
                this.input.teamType?.properties?.trial?.active
        },
        isBillingRequired () {
            return this.billingEnabled &&
                   !this.isSelectionTrial &&
                   ((this.input.teamType && !this.input.teamType.properties?.billing?.disabled) ||
                   (this.presetTeamType && !this.presetTeamType.properties?.billing?.disabled))
        }

    },
    async created () {
        const teamTypesPromise = await teamTypesApi.getTeamTypes()

        this.teamTypes = (await teamTypesPromise).types.sort((a, b) => a.order - b.order)
        this.input.teamTypeId = this.teamTypes[0].id

        if (this.$route.query.teamType) {
            this.input.teamTypeId = this.$route.query.teamType
            for (const teamType of this.teamTypes) {
                if (teamType.id === this.input.teamTypeId) {
                    this.presetTeamType = teamType
                    break
                }
            }
        }
    },
    mounted () {
        this.mounted = true
        // was a team type pre-determined
    },
    methods: {
        createTeam () {
            this.loading = true

            const opts = {
                name: this.input.name,
                slug: this.input.slug || this.input.defaultSlug,
                type: this.input.teamTypeId
            }
            // Check if we should set the trial flag
            if (
                // TeamType has trial mode enabled
                this.input.teamType.properties?.trial?.active &&
                // User has no other teams
                this.teams.length === 0 &&
                // User is less than a week old
                (Date.now() - (new Date(this.user.createdAt)).getTime()) < 1000 * 60 * 60 * 24 * 7
            ) {
                opts.trial = true
            }

            teamApi.create(opts).then(async result => {
                await this.$store.dispatch('account/refreshTeams')
                await this.$store.dispatch('account/setTeam', result)
                // are we in EE?
                if (result.billingURL) {
                    this.redirecting = true
                    window.open(result.billingURL, '_self')
                } else {
                    this.$router.push({ name: 'Team', params: { team_slug: result.slug } })
                }
            }).catch(err => {
                if (err.response.data) {
                    if (/slug/.test(err.response.data.error)) {
                        this.input.slugError = 'Slug already in use'
                    }
                }
            }).finally(() => {
                this.loading = false
            })
        },
        checkSlug () {
            if (this.pendingSlugCheck) {
                clearTimeout(this.pendingSlugCheck)
            }
            this.pendingSlugCheck = setTimeout(() => {
                this.pendingSlugCheck = null
                if (this.input.slug && this.slugValid) {
                    teamsApi.checkSlug(this.input.slug).then(() => {
                        if (this.slugValid) {
                            this.input.slugError = ''
                        }
                    }).catch(_ => {
                        if (this.slugValid) {
                            this.input.slugError = 'Slug unavailable'
                        }
                    })
                }
            }, 200)
        },
        sendContact: async function () {
            this.talkToSalesCalendarModal(this.user)
        }
    },
    components: {
        FormRow,
        ExternalLinkIcon,
        'team-type-tile': TeamTypeTile
    }
}
</script>
