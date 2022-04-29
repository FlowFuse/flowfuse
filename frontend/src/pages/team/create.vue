<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template v-slot:back>
                <router-link :to="{name: 'Projects', params: {team_slug: team.slug}}">
                    <nav-item :icon="icons.chevronLeft" label="Back to Projects"></nav-item>
                </router-link>
            </template>
        </SideNavigation>
    </Teleport>
    <main>
        <div class="max-w-2xl m-auto">
            <form class="space-y-6" v-if="!needsBilling">
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
                        <pre>/team/&lt;slug&gt;</pre>
                    </template>
                </FormRow>

                <ff-button :disabled="!formValid" @click="createTeam()">
                    Create team
                </ff-button>
            </form>
            <form v-else>
                <h3 class="font-bold">New Team: {{ newTeam ? newTeam.name : '' }}</h3>
                <p class="text-sm mt-3">You are about to proceed to Stripe, our payment provider, in order to setup the relevant billing details.</p>
                <p class="text-sm mt-2">You will only be charged for each project when you create it.</p>
                <div class="mt-3">
                    <ff-button @click="customerPortal()">
                        <span>Proceed to Stripe</span>
                    </ff-button>
                </div>
            </form>
        </div>
    </main>
</template>

<script>
import { mapState } from 'vuex'

import teamApi from '@/api/team'
import slugify from '@/utils/slugify'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

import NavItem from '@/components/NavItem'
import SideNavigation from '@/components/SideNavigation'

import { ChevronLeftIcon } from '@heroicons/vue/solid'

export default {
    name: 'CreateTeam',
    data () {
        return {
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            teams: [],
            input: {
                name: '',
                slug: '',
                defaultSlug: '',
                slugError: ''
            },
            needsBilling: false,
            newTeam: null
        }
    },
    watch: {
        'input.name': function () {
            this.input.slug = slugify(this.input.name)
        },
        'input.slug': function (v) {
            if (v && !/^[a-z0-9-_]+$/i.test(v)) {
                this.input.slugError = 'Must only contain a-z 0-9 - _'
            } else {
                this.input.slugError = ''
            }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        formValid () {
            return this.input.name && !this.input.slugError
        }
    },
    mounted () {
        this.mounted = true
    },
    methods: {
        createTeam () {
            const opts = {
                name: this.input.name,
                slug: this.input.slug || this.input.defaultSlug
            }

            teamApi.create(opts).then(async result => {
                await this.$store.dispatch('account/refreshTeams')
                await this.$store.dispatch('account/setTeam', result)
                // are we in EE?
                if (result.billingURL) {
                    this.newTeam = result
                    this.needsBilling = true
                } else {
                    // TODO: Re-route this to a holding billing page that will redirect to Stripe
                    this.goToNewTeam(result.slug)
                }
            }).catch(err => {
                if (err.response.data) {
                    if (/slug/.test(err.response.data.error)) {
                        this.input.slugError = 'Slug already in use'
                    }
                }
            })
        },
        goToNewTeam (slug) {
            this.$router.push({ name: 'Team', params: { team_slug: slug } })
        },
        customerPortal () {
            window.open(this.newTeam.billingURL, '_self')
        }
    },
    components: {
        FormRow,
        FormHeading,
        SideNavigation,
        NavItem
    }
}
</script>
