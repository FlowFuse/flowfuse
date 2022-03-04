<template>
    <div class="forge-block">
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
                        <code>/team/&lt;slug&gt;</code>
                    </template>
                </FormRow>

                <button type="button" :disabled="!formValid" @click="createTeam" class="forge-button">
                    Create team
                </button>
            </form>
            <form v-else>
                <h3 class="font-bold">New Team: {{ team ? team.name : '' }}</h3>
                <p class="text-sm mt-3">Please navigate to Stripe in order to complete the relevant billing details.</p>
                <p class="text-sm mt-2">Charges are calculated based on a project-by-project basis. Each project is charged at a standard <b>$XX/month.</b></p>
                <div class="mt-3">
                    <button type="button" class="forge-button" @click="customerPortal()">
                        <span>Stripe Billing Portal</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script>
import teamApi from '@/api/team'
import slugify from '@/utils/slugify'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import Breadcrumbs from '@/mixins/Breadcrumbs'

export default {
    name: 'CreateTeam',
    mixins: [Breadcrumbs],
    data () {
        return {
            teams: [],
            input: {
                name: '',
                slug: '',
                defaultSlug: '',
                slugError: ''
            },
            needsBilling: false,
            team: null
        }
    },
    created () {
        this.clearBreadcrumbs()
    },
    watch: {
        'input.name': function () {
            this.input.defaultSlug = slugify(this.input.name)
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
        formValid () {
            return this.input.name && !this.input.slugError
        }
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
                    this.team = result
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
            window.open(this.team.billingURL, '_self')
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
