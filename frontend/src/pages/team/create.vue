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
                        <p>You will not be charged for creating the team. You will be charged for the projects
                            you create within the team. For more information on billing, please read our <a class="underline" href="https://flowforge.com/docs/cloud/billing/">Billing documentation</a>.</p>
                    </div>
                    <ff-button @click="createTeam()">
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
import slugify from '@/utils/slugify'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'

import NavItem from '@/components/NavItem'
import SideNavigation from '@/components/SideNavigation'

import { ChevronLeftIcon, ExternalLinkIcon } from '@heroicons/vue/solid'

export default {
    name: 'CreateTeam',
    data () {
        return {
            mounted: false,
            loading: false,
            redirecting: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            input: {
                name: '',
                slug: '',
                defaultSlug: '',
                slugError: ''
            },
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
        }
    },
    computed: {
        ...mapState('account', ['team', 'features']),
        formValid () {
            return this.input.teamType && this.input.name && !this.input.slugError && !this.errors.name
        },
        billingEnabled () {
            return this.features.billing
        }
    },
    mounted () {
        this.mounted = true
    },
    methods: {
        createTeam () {
            this.loading = true

            const opts = {
                name: this.input.name,
                slug: this.input.slug || this.input.defaultSlug
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
