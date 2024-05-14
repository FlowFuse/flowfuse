<template>
    <main class="ff-bg-dark flex-grow flex flex-col">
        <div class="w-full mx-auto flex-grow flex flex-col">
            <Loading color="white" />
        </div>
    </main>
</template>

<script>
import Loading from '../Loading.vue'

export default {
    name: 'EndingOverlay',
    components: { Loading }
}
</script>
