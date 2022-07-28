<template>
    <ff-button @click="removeInvite" size="small" kind="danger">
        <template v-slot:icon><TrashIcon/></template>
    </ff-button>
</template>
<script>

import alerts from '@/services/alerts'

import { TrashIcon } from '@heroicons/vue/outline'

export default {
    props: ['id', 'team', 'onremove'],
    components: {
        TrashIcon
    },
    methods: {
        async removeInvite () {
            await this.onremove(this.team.id, this.id)
            alerts.emit('Invite successfully removed', 'confirmation')
        }
    }
}
</script>
