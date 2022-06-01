<template>
    <div class="ff-loading flex-grow flex flex-col items-center justify-center mx-auto" :class="{'theme-light': color == 'black', 'theme-dark': color == 'white'}">
        <div class="text-center w-64">
            <lottie-animation v-if="color == 'white'" :animationData="require('../images/lottie/ff-loading-white.json')" :loop="true"/>
            <lottie-animation v-else-if="color == 'black'" :animationData="require('../images/lottie/ff-loading-black.json')" :loop="true"/>
            <h4>{{ message || 'Loading...' }}</h4>
        </div>
    </div>
</template>
<script>

export default {
    name: 'ff-loading',
    props: {
        color: {
            default: 'black', // 'white', 'black'
            type: String
        },
        message: {
            default: null,
            type: String
        }
    }
}
</script>
