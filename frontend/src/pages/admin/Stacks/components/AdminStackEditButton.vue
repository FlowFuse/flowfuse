<template>
    <DropdownMenu buttonClass="forge-button-inline px-2" alt="Open stack menu" :options="options"></DropdownMenu>
</template>
<script>
import DropdownMenu from '@/components/DropdownMenu'
export default {
    name: 'AdminStackEditButton',
    props: ['active', 'projectCount', 'replacedBy', 'id'],
    emits: ['stackAction'],
    computed: {
        options: function () {
            return [
                { name: 'Create new version', disabled: !!this.replacedBy, action: () => { this.$parent.$emit('stackAction', 'createNewVersion', this.id) } },
                { name: 'Edit properties', disabled: !!this.replacedBy, action: () => { this.$parent.$emit('stackAction', 'editProperties', this.id) } },
                { name: 'Delete stack', disabled: this.projectCount > 0, action: () => { this.$parent.$emit('stackAction', 'delete', this.id) } }
            ]
        }
    },
    components: {
        DropdownMenu
    }
}
</script>
