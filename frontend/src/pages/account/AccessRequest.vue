<template>
    <div class="flex flex-col items-center">
        <h2>{{ $t('ui.anApplicationWouldLikeToConnectToYourAccount') }}</h2>
        <div v-if="user" class="flex flex-row justify-center">
            <div class="flex">
                <RectangleGroupIcon class="w-12" />
                <ArrowSmallLeftIcon class="w-8" />
                <KeyIcon class="w-8" />
                <ArrowSmallRightIcon class="w-8" />
                <div class="ff-user">
                    <img :src="user.avatar" class="ff-avatar-large">
                </div>
            </div>
        </div>
        <div class="my-4">
            {{ $t('ui.thisApplicationWillHaveAccessToYourTeamsAndInsta') }}
        </div>
        <div class="ff-actions flex flex-row">
            <ff-button class="mx-8" data-action="deny-access" @click="denyAccess">{{ $t('ui.deny') }}</ff-button>
            <ff-button class="mx-8" data-action="allow-access" @click="allowAccess">{{ $t('ui.allow') }}</ff-button>
        </div>
    </div>
</template>

<script>
import { ArrowSmallLeftIcon, ArrowSmallRightIcon, KeyIcon, RectangleGroupIcon } from '@heroicons/vue/20/solid'
import { mapState } from 'pinia'

import { useAccountAuthStore } from '@/stores/account-auth.js'

export default {
    name: 'AccessRequest',
    components: {
        RectangleGroupIcon,
        KeyIcon,
        ArrowSmallRightIcon,
        ArrowSmallLeftIcon
    },
    computed: {
        ...mapState(useAccountAuthStore, ['user'])
    },
    methods: {
        allowAccess () {
            window.location.href = `/account/complete/${this.$router.currentRoute.value.params.id}`
        },
        denyAccess () {
            window.location.href = `/account/reject/${this.$router.currentRoute.value.params.id}`
        }
    }
}
</script>
