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
            <instances-list :instances="instances" />
        </template>
    </ff-accordion>
</template>

<script>
import FfAccordion from '../../../../components/Accordion.vue'

import InstancesList from './InstancesList.vue'

export default {
    name: 'VersionsList',
    components: { FfAccordion, InstancesList },
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

  &:last-of-type {
    button {
      border-bottom: none;
    }
  }

}
</style>
