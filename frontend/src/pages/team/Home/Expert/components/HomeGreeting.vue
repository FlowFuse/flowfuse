<template>
    <div class="greeting" data-el="greeting">
        <img src="/ff-minimal-red.svg" alt="FlowFuse" class="greeting__mark">
        <h2 class="greeting__text" data-el="greeting-text">{{ greeting }}</h2>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'

defineOptions({ name: 'HomeGreeting' })

const accountAuthStore = useAccountAuthStore()

const firstName = computed<string>(() => accountAuthStore.user?.name?.trim().split(' ')[0] ?? '')

type TimeOfDay = 'morning' | 'afternoon' | 'evening'

const timeOfDay = computed<TimeOfDay>(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
})

const greeting = computed(() => (
    firstName.value
        ? `Good ${timeOfDay.value}, ${firstName.value}`
        : `Good ${timeOfDay.value}`
))
</script>

<style scoped lang="scss">
.greeting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 72px 0 0;

    &__mark {
        width: 56px;
        height: 56px;
    }

    &__text {
        margin: 0;
        font-size: 30px;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: -0.02em;
        text-wrap: balance;
        color: var(--ff-color-text-strong);
    }
}
</style>
