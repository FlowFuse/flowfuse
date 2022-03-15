<template>
    <DropdownMenu buttonClass="forge-button-inline px-2" alt="Open user menu" :options="options"></DropdownMenu>
</template>
<script>
import { DotsHorizontalIcon } from '@heroicons/vue/outline'
import DropdownMenu from '@/components/DropdownMenu'
export default {
    name: "AdminUserEditButton",
    props: ['onedit'],
    computed: {
        options: function() {
            return [
                { name: "Edit user", action: () => { this.onedit() } },
            ]
        }
    },
    components: {
        DotsHorizontalIcon,
        DropdownMenu
    }
}
</script>
