<template>
    <div class="flex flex-col items-center">
        <h2>Redirecting back to your instance editor</h2>
        <div v-if="user" class="flex flex-row justify-center">
            <div class="flex">
                <div class="ff-user">
                    <img :src="user.avatar" class="ff-avatar-large">
                </div>
                <ArrowSmRightIcon class="w-8" />
                <TemplateIcon class="w-12" />
            </div>
        </div>
    </div>
</template>

<script>
import { ArrowSmRightIcon, TemplateIcon } from '@heroicons/vue/solid'
import { mapState, useStore } from 'vuex'

export default {
    name: 'AccessRequest',
    components: {
        TemplateIcon,
        ArrowSmRightIcon
    },
    computed: {
        ...mapState('account', ['user', 'team'])
    },
    mounted () {
        const store = useStore()
        // If we've got here, remove any redirect url to prevent further unexpected redirects to this route
        store.dispatch('account/setRedirectUrl', null)
        window.location.href = `/account/complete/${this.$router.currentRoute.value.params.id}`
    }
}
</script>
