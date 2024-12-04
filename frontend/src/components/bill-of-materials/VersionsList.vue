<template>
    <ff-accordion class="versions-list" data-el="versions-list">
        <template #label>
            <div class="version">
                <span class="truncate">{{ version }}</span>
            </div>
            <div class="counter truncate">
                <span class="truncate">
                    <span v-if="instancesCount > 0" class="instance-counter">{{ instancesCount }} x Instances</span>
                    <span v-if="hasInstances & hasDevices" class="delimiter">, </span>
                    <span v-if="devicesCount > 0" class="devices-counter">{{ devicesCount }} x Devices</span>
                </span>
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
import FfAccordion from '../Accordion.vue'

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
.versions-list.ff-accordion {
    margin: 0;

    button {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        background: $ff-white;
        gap: 15px;
        border: none;
        border-bottom: 1px solid $ff-grey-300;

        .version {
            grid-column-start: 2;
            display: flex;
            justify-content: flex-start;
            span {
                color: $ff-black;
                font-weight: 500;
            }
        }

        .counter {
            grid-column-start: 3;
            grid-column-end: 6;
            display: flex;
            justify-content: flex-start;
            gap: 2px;
        }

        .toggle {
            grid-column-start: 12;
            display: flex;
            justify-content: flex-end;
        }
    }

    &:last-child button {
        border-bottom: none;
    }
}
</style>
