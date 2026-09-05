<template>
    <div class="space-y-6">
        <FormHeading>{{ $t('ui.activeSessions') }}</FormHeading>
        <p class="mb-4 italic text-red-800">{{ $t('ui.aListOfActiveLoginSessions') }}</p>
    </div>
</template>

<script>
import FormHeading from '../../../components/FormHeading.vue'

export default {
    name: 'AccountSecuritySessions',
    components: {
        FormHeading
    }
}
</script>
