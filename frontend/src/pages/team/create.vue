<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation v-if="team">
            <template #back>
                <router-link :to="{name: 'Home'}">
                    <nav-item :icon="icons.chevronLeft" label="Back to Dashboard" />
                </router-link>
            </template>
        </SideNavigation>
    </Teleport>
    <ff-page>
        <ff-loading v-if="redirecting" message="Redirecting to Stripe..." />
        <ff-loading v-else-if="loading" message="Creating Team..." />
        <div v-else class="m-auto">
            <form class="space-y-6">
                <FormHeading>Create a new team</FormHeading>
                <div class="mb-8 text-sm text-gray-500">Teams are how you organize who collaborates on your applications.</div>
                <!-- TeamType Type -->
                <div class="grid">
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
                <template v-if="!isContactRequired">
                    <FormRow id="team" v-model="input.name" :error="errors.name">
                        Team Name
                        <template #description>
                            eg. 'Development'
                        </template>
                    </FormRow>

                    <FormRow id="team" v-model="input.slug" :error="input.slugError" :placeholder="input.defaultSlug">
                        URL Slug
                        <template #description>
                            Use the default slug based on the team name or set your own.<br>
                            <pre>/team/&lt;slug&gt;</pre>
                        </template>
                    </FormRow>

                    <template v-if="billingEnabled">
                        <div class="mb-8 text-sm text-gray-500 space-y-2">
                            <p>To create the team we need to setup payment details via Stripe, our secure payment provider.</p>
                        </div>
                        <ff-button :disabled="!formValid" @click="createTeam()">
                            <template #icon-right><ExternalLinkIcon /></template>
                            Create team and setup payment details
                        </ff-button>
                    </template>
                    <ff-button v-else :disabled="!formValid" @click="createTeam()">
                        Create team
                    </ff-button>
                </template>
                <template v-else>
                    <div class="mb-8 text-sm text-gray-500 space-y-2">
                        <p>To learn more about our {{ input.teamType?.name }} plan, click below to contact our sales team.</p>
                    </div>
                    <ff-button @click="sendContact()">
                        Contact Sales
                    </ff-button>
                </template>
            </form>
        </div>
    </ff-page>
</template>

<script>
import { ChevronLeftIcon, ExternalLinkIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import billingApi from '../../api/billing.js'
import teamApi from '../../api/team.js'
import teamTypesApi from '../../api/teamTypes.js'
import teamsApi from '../../api/teams.js'
import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'

import NavItem from '../../components/NavItem.vue'
import SideNavigation from '../../components/SideNavigation.vue'
import Alerts from '../../services/alerts.js'
import slugify from '../../utils/slugify.js'

export default {
    name: 'CreateTeam',
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
            needsBilling: false,
            newTeam: null,
            errors: {},
            pendingSlugCheck: null
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
        ...mapState('account', ['user', 'team', 'features']),
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
        }
    },
    async created () {
        const teamTypesPromise = await teamTypesApi.getTeamTypes()

        this.teamTypes = (await teamTypesPromise).types
        this.input.teamTypeId = this.teamTypes[0].id
    },
    mounted () {
        this.mounted = true
    },
    methods: {
        createTeam () {
            this.loading = true

            const opts = {
                name: this.input.name,
                slug: this.input.slug || this.input.defaultSlug,
                type: this.input.teamTypeId
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
            if (this.input.teamType) {
                billingApi.sendTeamTypeContact(this.user, this.input.teamType, 'Create Team').then(() => {
                    this.$router.go(-1)
                    Alerts.emit('Thanks for getting in touch. We will contact you soon regarding your request.', 'info', 15000)
                }).catch(err => {
                    Alerts.emit('Something went wrong with the request. Please try again or contact support for help.', 'info', 15000)
                    console.error('Failed to submit hubspot form: ', err)
                })
            }
        }
    },
    components: {
        FormRow,
        FormHeading,
        SideNavigation,
        NavItem,
        ExternalLinkIcon
    }
}
</script>
