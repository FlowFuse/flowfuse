<template>
    <div class="ff-team-type-tile">
        <div v-if="isTrial(teamType)" class="trial-ribbon">
            <label>{{ teamType.properties.trial.duration }} Days Free Trial</label>
        </div>
        <div class="space-y-2">
            <img class="w-36 m-auto" src="../images/empty-states/application-instances.png">
            <div class="flex flex-col gap-5">
                <div class="flex justify-between items-center text-2xl">
                    <label class="font-medium">{{ teamType.name }}</label>
                    <span v-if="pricing?.value">
                        {{ pricing.value }} <span class="text-xs">/{{ pricing.interval }}</span>
                    </span>
                </div>
                <ff-markdown-viewer :content="teamType.description" />
            </div>
        </div>
        <template v-if="enableCTA">
            <ff-button v-if="isTrial(teamType)" kind="primary" class="w-full mt-4" :to="`/team/create?teamType=${teamType.id}`">
                Start Free Trial
            </ff-button>
            <ff-button v-else-if="isManualBilling(teamType)" kind="secondary" class="w-full mt-4" @click="contactFF(teamType)">
                Contact FlowFuse
            </ff-button>
            <ff-button v-else kind="secondary" class="w-full mt-4" :to="`/team/create?teamType=${teamType.id}`">
                Select
            </ff-button>
        </template>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import BillingAPI from '../api/billing.js'
import Alerts from '../services/alerts.js'

export default {
    name: 'TeamTypeTile',
    props: {
        teamType: {
            type: Object,
            required: true
        },
        enableCTA: {
            type: Boolean,
            default: true
        }
    },
    computed: {
        ...mapState('account', ['user', 'teams']),
        pricing: function () {
            const billing = this.teamType.properties?.billing?.description?.split('/')
            const price = {}
            if (typeof billing !== 'undefined') {
                price.value = billing[0]
                price.interval = billing[1]
            }
            return price
        }
    },
    methods: {
        isTrial (teamType) {
            // A team trial can be offered if:
            // 1. User has no other teams
            return this.teams.length === 0 &&
            // 2. User is less than a week old
                (Date.now() - (new Date(this.user.createdAt)).getTime()) < 1000 * 60 * 60 * 24 * 7 &&
            // 3. TeamType meta data says so
                teamType.properties?.trial?.active
        },
        isManualBilling (teamType) {
            return teamType.properties?.billing?.requireContact
        },
        contactFF (teamType) {
            BillingAPI.sendTeamTypeContact(this.user, teamType, 'Create Team').then(() => {
                Alerts.emit('A message has been sent to our team. We will contact you soon regarding your request. In the mean time, feel free to choose another plan to get started.', 'confirmation', 20000)
            }).catch(err => {
                Alerts.emit('Something went wrong with the request. Please try again or contact support for help.', 'warning', 15000)
                console.error('Failed to submit hubspot form: ', err)
            })
        }
    }
}
</script>

<style lang="scss">
.ff-team-type-tile {
    position: relative;
    border-radius: 6px;
    border: 2px solid $ff-grey-300;
    background: white;
    box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.25);
    padding: 24px;
    width: 100%;
    max-width: 300px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    ul {
        list-style: disc;
        padding-left: 16px;
        li {
            margin-bottom: 6px;
        }
    }
}
.trial-ribbon {
    --ribbon-overlap: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 30px;
    left: calc(-1 * var(--ribbon-overlap));
    line-height: 1.3;
    width: calc(100% + 2 * var(--ribbon-overlap));
    margin: 0;
    position: absolute;
    top: 8px;
    color: white;
    // text-shadow: 0 1px 1px #111;
    border-top: 1px solid #363636;
    border-bottom: 1px solid #202020;
    background: $ff-red-500;
    // background: linear-gradient($ff-red-500 0%, $ff-red-700 100%);
    border-radius: 2px 2px 0 0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.trial-ribbon::before,
.trial-ribbon::after {
    content: '';
    display: block;
    width: 0;
    height: 0;
    position: absolute;
    bottom: calc((-2 * var(--ribbon-overlap)) - 1px);
    z-index: -10;
    border: var(--ribbon-overlap) solid;
    border-color: $ff-red-900 transparent transparent transparent;
}
.trial-ribbon::before {left: 0;}
.trial-ribbon::after {right: 0;}
</style>
