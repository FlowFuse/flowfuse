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
                    <ff-button class="w-full" :kind="option.ribbon ? 'primary' : 'secondary'" :to="option.to">
                        Select
                    </ff-button>
                </template>
            </MediumTile>
        </section>
    </div>
</template>

<script>

import { CheckIcon, MinusIcon } from '@heroicons/vue/outline'

import MediumTile from '../../../components/tiles/MediumTile.vue'

export default {
    name: 'ChooseBroker',
    components: {
        MediumTile,
        CheckIcon,
        MinusIcon
    },
    data () {
        return {
            types: [],
            options: [
                {
                    ribbon: 'Recommended',
                    title: 'FlowFuse Broker',
                    content: [
                        '20 x MQTT Clients included in your plan'
                    ],
                    contentType: 'check',
                    to: { name: 'team-brokers-clients', query: { 'creating-client': true } }
                },
                {
                    title: 'Bring your Own Broker',
                    content: [
                        'Requires a third-party broker to be setup'
                    ],
                    contentType: 'dash',
                    to: { name: 'Home' }
                }
            ]
        }
    },
    mounted () {
        // clears the creating-client query param that allows users to reach this page
        this.$router.replace({ query: '' })
    }
}
</script>

<style scoped lang="scss">

</style>
