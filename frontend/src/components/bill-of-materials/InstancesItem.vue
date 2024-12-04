<template>
    <div class="instance-item" data-el="instance-item">
        <div class="title truncate">
            <h6 v-if="isDevice">
                <IconDeviceSolid class="ff-icon text-teal-700" />
                <router-link :to="{name: 'DeviceOverview', params: {id: instance.id}}" class="ff-link">
                    {{ instance.name }}
                </router-link>
            </h6>
            <h6 v-else>
                <IconNodeRedSolid class="ff-icon text-red-700" />
                <router-link :to="{name: 'instance-overview', params: {id: instance.id}}" class="ff-link truncate">
                    {{ instance.name }}
                </router-link>
            </h6>
            <h6 v-if="instance.app">
                <router-link :to="{name: 'Application', params: {id: instance.app.id}}" class="ff-link truncate">
                    {{ instance.app.name }}
                </router-link>
            </h6>
        </div>
        <div class="actions">
            <status-badge v-if="instance.state" :status="instance.state" />
        </div>
    </div>
</template>

<script>
import StatusBadge from '../StatusBadge.vue'
import IconDeviceSolid from '../icons/DeviceSolid.js'
import IconNodeRedSolid from '../icons/NodeRedSolid.js'

export default {
    name: 'InstancesItem',
    components: {
        StatusBadge,
        IconNodeRedSolid,
        IconDeviceSolid
    },
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    computed: {
        isDevice () {
            return this.instance.type === 'device'
        }
    }
}
</script>

<style scoped lang="scss">
.instance-item {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 15px;
    background: $ff-grey-50;
    border-bottom: 1px solid $ff-grey-300;
    justify-content: space-between;
    padding: 6px;
    align-items: center;

    .title {
        grid-column-start: 2;
        grid-column-end: 6;
        display: flex;
        gap: 15px;
        justify-content: space-between;

        h6 {
            display: flex;
            gap: 6px;
        }
    }

    .actions {
        grid-column-start: 6;
        display: flex;
        justify-content: flex-end;
    }
}
</style>
