<template>
    <TransitionGroup class="ff-notifications" name="notifications-list" tag="div">
        <ff-notification-toast
            v-for="(a, $index) in alertsReversed" :key="a.timestamp"
            :type="a.type" :message="a.message" data-el="notification-alert"
            :countdown="a.countdown || 3000" @close="clearAlert($index)"
        />
    </TransitionGroup>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

import alertsService from '../services/alerts.js'

const alerts = ref([])
const alertsReversed = computed(() => [...alerts.value].reverse())

function clearAlert (i) {
    alerts.value.splice(alerts.value.length - 1 - i, 1)
}

onMounted(() => {
    alertsService.subscribe((message, type, countdown) => {
        alerts.value.push({ message, type, countdown, timestamp: Date.now() })
    })
})
</script>
