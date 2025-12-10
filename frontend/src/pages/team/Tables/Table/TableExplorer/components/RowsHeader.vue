<template>
    <section class="rows-header flex gap-2">
        <button class="toggle-collapse" type="button" @click="$emit('toggle-collapse')">
            <MenuExpand v-if="menuCollapsed" />
            <MenuCollapse v-else />
        </button>
    </section>
</template>

<script>
import MenuCollapse from '../../.././../../../components/icons/menu-collapse.js'
import MenuExpand from '../../.././../../../components/icons/menu-expand.js'
export default {
    name: 'RowsHeader',
    components: { MenuCollapse, MenuExpand },
    props: {
        menuCollapsed: {
            type: Boolean,
            required: true
        }
    },
    emits: ['toggle-collapse']
}
</script>

<style scoped lang="scss">
.rows-header {
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid $ff-color--border;

    .toggle-collapse {
        border: 1px solid transparent;
    }
}
</style>
