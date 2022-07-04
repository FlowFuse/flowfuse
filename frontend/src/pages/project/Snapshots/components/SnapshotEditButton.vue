<template>
    <DropdownMenu buttonClass="forge-button-inline px-2" alt="Open snapshot menu" :options="options"></DropdownMenu>
    <!-- <ff-kebab-menu menu-align="right">
        <template v-for="(item, $index) in options" :key="$index">
            <template v-if="item === null"><li class="ff-list-item"><hr/></li></template>
            <template v-else>
                <ff-list-item :label="item.name" @click="item.action" />
            </template>
        </template>
    </ff-kebab-menu> -->
</template>
<script>
import DropdownMenu from '@/components/DropdownMenu'
import { mapState } from 'vuex'

export default {
    name: 'SnapshotEditButton',
    props: ['id'],
    emits: ['snapshotAction'],
    computed: {
        ...mapState('account', ['features']),
        options: function () {
            // Trying something different for this menu. By using `this.$parent.$emit` we can register
            // event handlers on the containing ItemTable.
            // This is NOT generally a good way of doing things - as it reduces the reusability
            // of the component. But it does mean we don't have to add menu option handlers to
            // each item in the table (like we do in other tables).
            // At some point we will need to standardise on an approach for having
            // menu dropdowns in tables
            const menu = [
                { name: 'Delete snapshot', class: ['text-red-700'], action: () => { this.$parent.$emit('snapshotAction', 'delete', this.id) } }
            ]
            if (this.features.devices) {
                menu.unshift(null)
                menu.unshift({ name: 'Set as Device Target', action: () => { this.$parent.$emit('snapshotAction', 'setDeviceTarget', this.id) } })
            }
            menu.unshift({ name: 'Rollback', action: () => { this.$parent.$emit('snapshotAction', 'rollback', this.id) } })

            return menu
        }
    },
    components: {
        DropdownMenu
    }
}
</script>
