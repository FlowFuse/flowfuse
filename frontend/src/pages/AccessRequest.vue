<template>
    <div class="flex-grow flex flex-col items-center justify-center mx-auto h-92 text-gray-600 opacity-50">
        <Logo class="max-w-xs mx-auto w-full"/>
    </div>
</template>

<script>
import { mapState } from 'vuex'
import Logo from "@/components/Logo"

export default {
    name: "AccessRequest",
    components: {
        Logo
    }
}
</script>
