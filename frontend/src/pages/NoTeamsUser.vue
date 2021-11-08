<template>
    <div class="forge-block flex justify-center">
        <div class="sm:max-w-xl w-screen space-y-2">
            <div class="max-w-xs mx-auto w-full mb-4">
                <Logo/>
                <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">
                    <span>FLOW</span><span class="font-light">FORGE</span>
                </h2>
            </div>
            <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4">
                <p class="text-gray-700 text-lg mt-10 text-center">You don't have a team yet. We're working on that.</p>
            </form>
        </div>
    </div>
</template>

<script>

import Logo from "@/components/Logo"

export default {
    name: 'NoTeamsUser',
    components: {
        Logo
    }
}
</script>
