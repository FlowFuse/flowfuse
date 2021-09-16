<template>
    <div class="mx-auto flex items-center justify-center bg-gray-50 py-12">
        <div class="sm:w-72 w-xs w-screen space-y-2">
            <div class="flex justify-center">
                <div class="w-1/2"><Logo /></div>
            </div>
        </div>
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
