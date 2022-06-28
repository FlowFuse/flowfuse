<template>
    <DropdownMenu buttonClass="forge-button-inline px-2" alt="Open project type menu" :options="options"></DropdownMenu>
</template>
<script>
import DropdownMenu from '@/components/DropdownMenu'
export default {
    name: 'ProjectTypeEditButton',
    props: ['id'],
    emits: ['projectTypeAction'],
    computed: {
        options: function () {
            return [
                { name: 'Edit project type', action: () => { this.$emit('projectTypeAction', 'edit', this.id) } },
                { name: 'Delete project type', action: () => { this.$emit('projectTypeAction', 'delete', this.id) } }
            ]
        }
    },
    components: {
        DropdownMenu
    }
}
</script>
