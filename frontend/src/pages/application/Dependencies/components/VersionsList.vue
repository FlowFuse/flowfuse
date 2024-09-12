<template>
    <ff-accordion>
        <template #label>
            <div class="label-wrapper">
                <span class="version">{{ version }}</span>
                <div class="counter">
                    <span v-if="instancesCount > 0" class="instance-counter">{{ instancesCount }} x Instances</span>
                    <span v-if="hasInstances & hasDevices" class="delimiter">, </span>
                    <span v-if="devicesCount > 0" class="devices-counter">{{ devicesCount }} x Devices</span>
                </div>
            </div>
        </template>
        <template #content>
            <ul class="instances-list">
                <li v-for="instance in instances" :key="instance.id">
                    <instances-item :instance="instance" />
                </li>
            </ul>
        </template>
    </ff-accordion>
</template>

<script>
import FfAccordion from '../../../../components/Accordion.vue'

import InstancesItem from './InstancesItem.vue'

export default {
    name: 'VersionsList',
    components: { FfAccordion, InstancesItem },
    props: {
        version: {
            required: true, type: String
        },
        instances: {
            required: true, type: Array
        }
    },
    computed: {
        instancesCount () {
            return this.instances.filter(instance => instance.type === 'instance').length
        },
        hasInstances () {
            return this.instancesCount > 0
        },
        devicesCount () {
            return this.instances.filter(instance => instance.type === 'device').length
        },
        hasDevices () {
            return this.devicesCount > 0
        }
    }
}
</script>

<style lang="scss">
.ff-accordion {
  margin: 0;

  button {
    display: flex;
    background: #fff;
    border-left: none;
    border-right: none;
    border-top: none;

    .label-wrapper {
      flex: 1;
      justify-content: flex-start;
      display: flex;
      gap: 10%;
      margin-left: 10%;
      color: $ff-black;

      .version {
        padding: 0 15px;
        font-weight: 500;
      }
    }
  }
}
</style>
