<template>
    <router-link :to="{name: 'CreateTeam'}" class="forge-button">
        <PlusSmIcon class="w-5 h-5 my-1 -ml-1 mr-1" /><span>Create Team</span>
    </router-link>
</template>
<script>

import { PlusSmIcon } from '@heroicons/vue/outline'

export default {
    name: 'CreateTeamButton',
    components: {
        PlusSmIcon
    }
}
</script>
