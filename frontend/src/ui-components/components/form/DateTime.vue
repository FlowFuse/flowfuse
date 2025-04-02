<template>
    <vue-date-picker v-bind="$props" />
</template>

<script>

import VueDatePicker from '@vuepic/vue-datepicker'

// documentation https://vue3datepicker.com/props/modes/
export default {
    name: 'ff-date-time-picker',
    components: { VueDatePicker }
}
</script>

<style scoped lang="scss">

</style>
