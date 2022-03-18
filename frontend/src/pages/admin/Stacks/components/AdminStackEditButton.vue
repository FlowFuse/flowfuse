<template>
    <DropdownMenu buttonClass="forge-button-inline px-2" alt="Open stack menu" :options="options"></DropdownMenu>
</template>
<script>
import DropdownMenu from '@/components/DropdownMenu'
export default {
    name: 'AdminStackEditButton',
    props: ['onedit', 'ondelete'],
    computed: {
        options: function () {
            return [
                { name: 'Edit stack', action: () => { this.onedit() } },
                { name: 'Delete stack', action: () => { this.ondelete() } }
            ]
        }
    },
    components: {
        DropdownMenu
    }
}
</script>
