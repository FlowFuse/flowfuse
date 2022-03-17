<template>
    <a href="/team/create" class="forge-button">
        <PlusSmIcon class="w-5 h-5 my-1 -ml-1 mr-1" /><span>Create Team</span>
    </a>
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
