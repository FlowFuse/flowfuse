<template>
    <router-link v-slot="{ href, navigate }" v-bind="extendedProps" custom>
        <a v-bind="$attrs" :href="href" @click="navigate">
            <slot />
        </a>
    </router-link>
</template>

<script>
import { RouterLink as DefaultRouterLink } from 'vue-router'
import { mapState } from 'vuex'

export default {
    name: 'TeamLink',
    inheritAttrs: false,
    props: {
        ...DefaultRouterLink.props
    },
    computed: {
        ...mapState('account', ['team', 'teams']),
        extendedProps () {
            const props = { ...this.$props }

            if (!this.team) {
                // rewrite the url to point home where the user will either get redirected to his default team or to the
                // team creation page
                props.to.name = 'Home'
            }

            if (!props.to.params?.team_slug) {
                props.to.params = {
                    ...(props.to.params ?? {}),
                    team_slug: this.team.slug
                }
            }

            return props
        }
    }
}
</script>
