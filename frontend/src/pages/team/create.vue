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
        <div v-if="needsBilling" class="max-w-2xl m-auto">
            <form class="space-y-6" >
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
        </div>
        <div v-else>
            <div class="flex">
                <img class="w-64 mr-12" src="@/images/pictograms/node_catalog_red.png">
                <form class="pl-12 border-l">
                    <h3 class="font-bold">New Team: {{ newTeam ? newTeam.name : '' }}</h3>
                    <p class="mt-3">You are about to proceed to Stripe, our payment provider, in order to setup the relevant billing details.</p>
                    <p class="mt-3">Whilst we do not charge for creating a team, we request that payment details are provided.</p>
                    <p class="mt-2">You will only be charged for each project that you create, when you create it.</p>
                    <div class="mt-6">
                        <ff-button @click="customerPortal()">
                            <span>Proceed to Stripe</span>
                            <template v-slot:icon-right>
                                <ArrowRightIcon />
                            </template>
                        </ff-button>
                    </div>
                </form>
            </div>
            <div class="mt-12">
                <h4 class="py-4 pl-6 border-t border-b font-semibold">Frequently Asked Questions</h4>
                <ul v-for="qa in faqs" :key="qa.question">
                    <li class="pl-6 pt-6 pb-3">
                        <h5 class="font-medium">{{ qa.question }}</h5>
                        <p class="pt-3 pl-3 text-gray-600" v-html="qa.answer"></p>
                    </li>
                </ul>
            </div>
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

import { ChevronLeftIcon, ArrowRightIcon } from '@heroicons/vue/solid'

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
            newTeam: null,
            faqs: [{
                question: 'Why do I need to enter payment details?',
                answer: '<p>FlowForge charges for each project in your team on a recurring monthly basis, by setting up your card now your subscription is then automatically adjusted as you create projects.</p><p class="mt-3">We ask for a card to manage the risk of abuse that comes with offering a platform that can run arbitrary code.</p>'
            }, {
                question: 'Do you offer a free tier?',
                answer: '<p>At present, we do not offer a free tier. However, you can have multiple members of your team, all sharing access to the same project at no additional cost.</p>'
            }, {
                question: 'What will I get charged?',
                answer: '<p>Your card will be charged $15 when you create a project, and then $15 each month that the project is on your account.</p><p class="mt-3">Each team will get a single monthly charge for all the projects on the account, this will be on the same date that the team was created.</p><p class="mt-3>Any new projects created in the previous month will have a pro-rata credit on the invoice.</p>'
            }, {
                question: 'How do I cancel?',
                answer: '<p>When you delete a project from your team your account receives a credit for any unused time in the month. This credit is then held against the next invoice.</p><p class="mt-3">If you wish to cancel service completely then please delete all projects and email <a href="mailto:support@flowforge.com" class="text-blue-500">support@flowforge.com</a> to request a refund to your card.</p>'
            }, {
                question: 'Are my details safe?',
                answer: '<p>Your card details are held only by Stripe, one of the largest payment providers in the world, FlowForge do not store or have access to your card information.</p>'
            }, {
                question: 'Who are FlowForge?',
                answer: '<p>FlowForge is a US company registered in Delaware, we were founded in April 2021 and are backed by <a class="text-blue-500" href="https://opencoreventures.com/" target="_blank">Open Core Ventures</a></p><p class="mt-3">The team are all remote, located around the world, you can see more about the individuals on our <a class="text-blue-500" href="https://flowforge.com/team/">Team page</a></p>'
            }]
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
        NavItem,
        ArrowRightIcon
    }
}
</script>
