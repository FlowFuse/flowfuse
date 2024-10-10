<template>
    <SectionTopMenu hero="Notifications Hub" />
    <section class="flex gap-2">
        <button class="forge-button" @click="getAnnouncements">Get Announcements</button>
        <button class="forge-button forge-button-secondary" @click="sendAnnouncement">Send Announcement</button>
    </section>
</template>

<script>
import adminApi from '../../api/admin.js'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

export default {
    name: 'NotificationsHub',
    components: {
        SectionTopMenu
    },
    methods: {
        getAnnouncements () {
            return adminApi.getAnnouncementNotifications()
                .then(res => console.log(res))
        },
        sendAnnouncement () {
            return adminApi.sendAnnouncementNotification()
                .then(res => console.log(res))
        }
    }
}
</script>

<style scoped lang="scss">

</style>
