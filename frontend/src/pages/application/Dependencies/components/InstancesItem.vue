<template>
    <div class="instance-item">
        <div class="title">
            <h6>
                <IconDeviceSolid v-if="isDevice" class="ff-icon text-teal-700" />
                <IconNodeRedSolid v-else class="ff-icon text-red-700" />
                <router-link :to="{name: 'instance-overview', params: {id: instance.id}}" class="ff-link">
                    {{ instance.name }}
                </router-link>
            </h6>
        </div>
        <div class="actions">
            <status-badge :status="'running'" />
        </div>
    </div>
</template>

<script>
import StatusBadge from '../../../../components/StatusBadge.vue'
import IconDeviceSolid from '../../../../components/icons/DeviceSolid.js'
import IconNodeRedSolid from '../../../../components/icons/NodeRedSolid.js'

export default {
    name: 'InstancesItem',
    components: { StatusBadge, IconNodeRedSolid, IconDeviceSolid },
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
  background: $ff-grey-100;
  border-bottom: 1px solid $ff-grey-300;
  justify-content: space-between;
  padding: 5px;

  .title {
    grid-column-start: 2;
    grid-column-end: 4;

    h6 {
      display: flex;
      gap: 5px;
    }
  }

  .actions {
    grid-column-start: 6;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
