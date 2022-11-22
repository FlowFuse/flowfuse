<template>
    <div class="flex flex-col items-center">
        <h2>An application would like to connect to your account</h2>
        <div v-if="user" class="flex flex-row justify-center">
            <div class="flex" >
                <TemplateIcon class="w-12" />
                <ArrowSmLeftIcon class="w-8" />
                <KeyIcon class="w-8" />
                <ArrowSmRightIcon class="w-8" />
                <div class="ff-user">
                    <img :src="user.avatar" class="ff-avatar-large"/>
                </div>
            </div>
        </div>
        <div class="my-4">
            This application will have access to your teams and projects.
        </div>
        <div class="ff-actions flex flex-row">
            <ff-button class="mx-8" data-action="deny-access" @click="denyAccess">Deny</ff-button>
            <ff-button class="mx-8" data-action="allow-access" @click="allowAccess">Allow</ff-button>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import { TemplateIcon, KeyIcon, ArrowSmLeftIcon, ArrowSmRightIcon } from '@heroicons/vue/solid'

export default {
    name: 'AccessRequest',
    computed: {
        ...mapState('account', ['user', 'team'])
    },
    components: {
        TemplateIcon,
        KeyIcon,
        ArrowSmRightIcon,
        ArrowSmLeftIcon
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
