<template>
    <div class="instance-item">
        <h6>
            <IconDeviceSolid v-if="isDevice" class="ff-icon text-teal-700" />
            <IconNodeRedSolid v-else class="ff-icon text-red-700" />
            {{ instance.name }}
        </h6>
        <status-badge :status="'running'" />
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
  background: $ff-grey-100;
  padding: 5px 5px 5px 25%;
  border-bottom: 1px solid $ff-grey-300;
  display: flex;
  justify-content: space-between;
  h6 {
    flex: 1;
    display: flex;
    gap: 5px;
  }
}
</style>
