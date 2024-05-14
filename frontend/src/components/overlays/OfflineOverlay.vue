<template>
    <main class="ff-bg-dark flex-grow flex flex-col">
        <div class="w-full max-w-screen-2xl mx-auto my-2 sm:my-8 flex-grow flex flex-col">
            <Offline />
        </div>
    </main>
</template>

<script>
import Offline from '../Offline.vue'

export default {
    name: 'OfflineOverlay',
    components: { Offline }
}
</script>
