<template>
    <div class="space-x-2">
        <ff-button kind="danger" size="small" @click="rejectInvite">Reject</ff-button>
        <ff-button @click="acceptInvite" size="small" >Accept</ff-button>
    </div>
</template>
<script>

export default {
    name: 'UserInviteActions',
    props: ['id', 'onaccept', 'onreject'],
    methods: {
        async acceptInvite () {
            await this.onaccept(this.id)
        },
        async rejectInvite () {
            await this.onreject(this.id)
        }
    }
}
</script>
