<template>
    <div class="space-y-6">
        <FormHeading>Active Sessions</FormHeading>
        <p class="mb-4 italic text-red-800">A list of active login sessions.</p>
    </div>
</template>

<script>
import FormHeading from '@/components/FormHeading'

export default {
    name: 'AccountSecuritySessions',
    components: {
        FormHeading
    }
}
</script>
