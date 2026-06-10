<template>
    <div
        class="ff-loading grow flex flex-col items-center justify-center mx-auto"
        :class="{'theme-light': resolvedColor == 'black', 'theme-dark': resolvedColor == 'white'}"
        data-el="loading"
    >
        <div class="text-center w-64">
            <lottie-animation v-if="resolvedColor == 'white'" :animationData="require('../images/lottie/ff-loading-white.json')" :loop="true" />
            <lottie-animation v-else :animationData="require('../images/lottie/ff-loading-black.json')" :loop="true" />
            <h4>{{ message || 'Loading...' }}</h4>
        </div>
    </div>
</template>
<script>
import { mapState } from 'pinia'

import { useThemeStore } from '@/stores/theme.ts'

export default {
    name: 'ff-loading',
    props: {
        color: {
            default: null,
            type: String
        },
        message: {
            default: null,
            type: String
        }
    },
    computed: {
        ...mapState(useThemeStore, ['effective']),
        resolvedColor () {
            return this.color || (this.effective === 'dark' ? 'white' : 'black')
        }
    }
}
</script>
