<template>
    <div class="create-broker py-20 flex flex-col gap-9">
        <section class="flex gap-6 justify-center relative z-10 flex-wrap">
            <h2>Chose which Broker you'd like to get setup with:</h2>
        </section>

        <section class="flex gap-6 justify-center relative z-10 flex-wrap">
            <MediumTile
                v-for="(option, $key) in options"
                :key="$key"
                :ribbon="option.ribbon"
                :title="option.title"
                :image-path="option.image"
                :data-value="option.title"
            >
                <template #image>
                    <img alt="tile-image" class="w-36 m-auto" src="../../../images/empty-states/mqtt-empty.png">
                </template>
                <template #content>
                    <ul>
                        <li v-for="(line, $lKey) in option.content" :key="$lKey" class="flex items-top gap-2">
                            <CheckIcon v-if="option.contentType === 'check'" class="ff-icon-sm" />
                            <MinusIcon v-else class="ff-icon-sm" />
                            {{ line }}
                        </li>
                    </ul>
                </template>
                <template #call-to-action>
                    <ff-button
                        class="w-full" data-el="select"
                        :kind="option.ribbon || options.length === 1 ? 'primary' : 'secondary'"
                        :to="option.to"
                    >
                        Select
                    </ff-button>
                </template>
            </MediumTile>
        </section>

        <section class="actions flex items-center justify-center">
            <ff-button v-if="shouldDisplayBackButton" kind="tertiary" data-el="page-back" @click="$router.back()">
                Back
            </ff-button>
        </section>
    </div>
</template>

<script>

import { CheckIcon, MinusIcon } from '@heroicons/vue/outline'
import { mapGetters } from 'vuex'

import MediumTile from '../../../components/tiles/MediumTile.vue'

export default {
    name: 'ChooseBroker',
    components: {
        MediumTile,
        CheckIcon,
        MinusIcon
    },
    computed: {
        ...mapGetters('product', ['hasFfUnsClients', 'hasBrokers']),
        options () {
            return [
                {
                    ribbon: 'Recommended',
                    title: 'FlowFuse Broker',
                    content: [
                        '20 x MQTT Clients included in your plan'
                    ],
                    contentType: 'check',
                    to: { name: 'team-brokers-first-client' },
                    hidden: this.hasFfUnsClients
                },
                {
                    title: 'Bring your Own Broker',
                    content: [
                        'Requires a third-party broker to be setup'
                    ],
                    contentType: 'dash',
                    to: { name: 'team-brokers-new' }
                }
            ].filter(op => !op.hidden)
        },
        shouldDisplayBackButton () {
            return this.hasFfUnsClients || this.hasBrokers
        }
    }
}
</script>

<style scoped lang="scss">

</style>
