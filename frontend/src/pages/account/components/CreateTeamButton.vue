<template>
    <router-link :to="{name: 'CreateTeam'}" class="forge-button">
        <PlusSmallIcon class="w-5 h-5 my-1 -ml-1 mr-1" /><span>Create Team</span>
    </router-link>
</template>
<script>

import { PlusSmallIcon } from '@heroicons/vue/24/outline'

export default {
    name: 'CreateTeamButton',
    components: {
        PlusSmallIcon
    }
}
</script>
