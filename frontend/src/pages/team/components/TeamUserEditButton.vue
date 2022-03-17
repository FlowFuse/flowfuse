<template>
    <DropdownMenu buttonClass="forge-button-inline px-2" alt="Open user menu" :options="options"></DropdownMenu>
</template>
<script>
import DropdownMenu from '@/components/DropdownMenu'
export default {
    name: 'TeamUserEditButton',
    props: ['onselect'],
    computed: {
        options: function () {
            return [
                { name: 'Change role', action: () => { this.onselect('changerole') } },
                null,
                { name: 'Remove from team', class: ['text-red-700'], action: () => { this.onselect('remove') } }
            ]
        }
    },
    components: {
        DropdownMenu
    }
}
</script>
