<template>
    <main class="not-found-wrapper">
        <div class="text-center not-found-container">
            <div class="image-wrapper">
                <img src="../images/icons/not-found.svg" alt="404-icon">
            </div>
            <div class="title">
                <h2>Oops! Looks like you've lost the flow...</h2>
            </div>
            <div class="message">
                <p>But don't worry, it's easy to get back on track!</p>
            </div>
            <div class="actions">
                <ff-button @click="$router.back()">Go Back</ff-button>
                <router-link :to="{name: 'Home'}" class="ff-btn ff-btn--primary">Go to Homepage</router-link>
            </div>
        </div>
    </main>
</template>

<script>

import FfButton from '../ui-components/components/Button.vue'

export default {
    name: 'PageNotFound',
    components: { FfButton }
}
</script>

<style lang="scss" scoped>
.not-found-wrapper {
    background: none;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;

    .not-found-container {
        background: $ff-white;
        padding: 30px 150px;
        margin: 50px;
        border-radius: 20px;
        box-shadow: 0 0 50px rgba(0, 0, 0, 0.2);

        .image-wrapper {
            display: flex;
            justify-content: center;
            margin: 30px 0;
        }

        .title {
            margin: 30px 0;
        }

        .actions {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin: 30px 0 15px;
        }
    }
}
</style>
