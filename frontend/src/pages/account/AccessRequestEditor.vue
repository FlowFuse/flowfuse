<template>
    <div class="flex flex-col items-center">
        <h2>Redirecting back to your instance editor</h2>
        <div v-if="user" class="flex flex-row justify-center">
            <div class="flex" >
                <div class="ff-user">
                    <img :src="user.avatar" class="ff-avatar-large"/>
                </div>
                <ArrowSmRightIcon class="w-8" />
                <TemplateIcon class="w-12" />
            </div>
        </div>
    </div>
</template>

<script>
import { ArrowSmRightIcon, TemplateIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

export default {
    name: 'AccessRequest',
    computed: {
        ...mapState('account', ['user', 'team'])
    },
    components: {
        TemplateIcon,
        ArrowSmRightIcon
    },
    mounted () {
        window.location.href = `/account/complete/${this.$router.currentRoute.value.params.id}`
    }
}
</script>
