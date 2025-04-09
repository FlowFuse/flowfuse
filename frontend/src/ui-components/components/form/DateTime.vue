<template>
    <vue-date-picker v-bind="$props" />
</template>

<script>

import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

// documentation https://vue3datepicker.com/props/modes/
export default {
    name: 'ff-date-time-picker',
    components: { VueDatePicker }
}
</script>

<style lang="scss">
.dp__action_button {
    &.dp__action_select {
        background: $ff-indigo-700;

        &[disabled] {
            background: $ff-grey-300;
        }
    }
}

</style>
