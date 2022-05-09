<template>
    <DropdownMenu buttonClass="forge-button-inline px-2" alt="Open device menu" :options="options"></DropdownMenu>
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
export default {
    name: 'DeviceEditButton',
    props: ['id', 'project'],
    computed: {
        options: function () {
            // Trying something different for this menu. By using `this.$parent.$emit` we can register
            // event handlers on the containing ItemTable.
            // This is NOT generally a good way of doing things - as it reduces the reusability
            // of the component. But it does mean we don't have to add menu option handlers to
            // each item in the table (like we do in other tables).
            // At some point we will need to standardise on an approach for having
            // menu dropdowns in tables
            const menu = [{ name: 'Edit details', action: () => { this.$parent.$emit('deviceAction', 'edit', this.id) } }]
            if (this.project) {
                menu.push(null)
                menu.push({ name: 'Remove from project', class: ['text-red-700'], action: () => { this.$parent.$emit('deviceAction', 'removeFromProject', this.id) } })
            } else {
                menu.push({ name: 'Add to project', action: () => { this.$parent.$emit('deviceAction', 'assignToProject', this.id) } })
                menu.push(null)
            }
            menu.push({ name: 'Regenerate credentials', class: ['text-red-700'], action: () => { this.$parent.$emit('deviceAction', 'updateCredentials', this.id) } })
            menu.push({ name: 'Delete device', class: ['text-red-700'], action: () => { this.$parent.$emit('deviceAction', 'delete', this.id) } })
            return menu
        }
    },
    components: {
        DropdownMenu
    }
}
</script>
