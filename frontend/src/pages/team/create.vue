<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation v-if="team">
            <template v-slot:back>
                <router-link :to="{name: 'Home'}">
                    <nav-item :icon="icons.chevronLeft" label="Back to Dashboard"></nav-item>
                </router-link>
            </template>
        </SideNavigation>
    </Teleport>
    <main>
        <ff-loading v-if="redirecting" message="Redirecting to Stripe..." />
        <ff-loading v-else-if="loading" message="Creating Team..." />
        <div v-else class="max-w-2xl m-auto">
            <form class="space-y-6" >
                <FormHeading>Create a new team</FormHeading>
                <div class="mb-8 text-sm text-gray-500">Teams are how you organize who collaborates on your projects.</div>
                <!-- TeamType Type -->
                <div class="flex flex-wrap gap-1 items-stretch">
                    <ff-tile-selection v-model="input.teamTypeId" >
                        <ff-tile-selection-option v-for="(teamType, index) in teamTypes" :key="index"
                                                  :label="teamType.name" :description="teamType.description"
                                                  :price="billingEnabled ? teamType.billingPrice : ''"
                                                  :price-interval="billingEnabled ? (!teamType.isFree ? 'per user/month' : '') : ''"
                                                  :value="teamType.id"/>
                    </ff-tile-selection>
                </div>
                <FormRow v-model="input.name" id="team" :error="errors.name">Team Name
                    <template v-slot:description>
                        eg. 'Development'
                    </template>
                </FormRow>

                <FormRow v-model="input.slug" id="team" :error="input.slugError" :placeholder="input.defaultSlug">URL Slug
                    <template v-slot:description>
                        Use the default slug based on the team name or set your own.<br/>
                        <pre>/team/&lt;slug&gt;</pre>
                    </template>
                </FormRow>

                <template v-if="billingEnabled">
                    <div class="mb-8 text-sm text-gray-500 space-y-2">
                        <p>To create the team we need to setup payment details via Stripe, our secure payment provider.</p>
                        <p v-if="input.teamType">
                            <span v-if="input.teamType.isFree">You will not be charged for creating this team.</span>
                            <span v-else>You will be charged <b>{{ input.teamType.billingPrice }} for each team member per month</b>.</span>
                            You will be charged for the projects you create within the team.
                            For more information on billing, please read our <a class="underline" href="https://flowforge.com/docs/cloud/billing/">Billing documentation</a>.
                        </p>
                    </div>
                    <div v-if="coupon">
                        <div class="mb-8 text-sm text-gray-500 space-y-2">Will apply coupon code <span v-text="coupon"></span> at checkout</div>
                    </div>
                    <div v-if="errors.coupon">
                        <div class="ml-9 text-red-400 inline text-xs">{{errors.coupon}}</div>
                    </div>
                    <ff-button :disabled="!formValid" @click="createTeam()">
                        <template v-slot:icon-right><ExternalLinkIcon /></template>
                        Create team and setup payment details
                    </ff-button>
                </template>
                <ff-button v-else :disabled="!formValid" @click="createTeam()">
                    Create team
                </ff-button>
            </form>
        </div>
    </main>
</template>

<script>
import { mapState } from 'vuex'

import teamApi from '@/api/team'
import teamTypesApi from '@/api/teamTypes'
import slugify from '@/utils/slugify'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

import NavItem from '@/components/NavItem'
import SideNavigation from '@/components/SideNavigation'

import Alerts from '@/services/alerts'

import { ChevronLeftIcon, ExternalLinkIcon } from '@heroicons/vue/solid'

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
            coupon: false,
            needsBilling: false,
            newTeam: null,
            errors: {}
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
            if (v && !/^[a-z0-9-_]+$/i.test(v)) {
                this.input.slugError = 'Must only contain a-z 0-9 - _'
            } else {
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
        ...mapState('account', ['team', 'features']),
        formValid () {
            return this.input.teamTypeId && this.input.name && !this.input.slugError && !this.errors.name
        },
        billingEnabled () {
            return this.features.billing
        }
    },
    async created () {
        const data = await teamTypesApi.getTeamTypes()
        this.teamTypes = data.types
        this.input.teamTypeId = this.teamTypes[0].id
        this.coupon = (await window.cookieStore.get('ff_coupon'))?.value.split('.')[0]
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
                    if (/promotion code/.test(err.response.data.error)) {
                        Alerts.emit(`${this.coupon} coupon invalid`, 'warning', 7500)
                        this.errors.coupon = `${this.coupon} is not a valid code. You will be able to provide an alternative code on the Stripe checkout page.`
                        this.coupon = undefined
                    }
                }
            }).finally(() => {
                this.loading = false
            })
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
