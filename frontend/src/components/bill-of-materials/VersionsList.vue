<template>
    <ff-accordion class="versions-list" data-el="versions-list" :data-item="version" @state-changed="resetCounter">
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
                <li v-for="instance in truncatedInstances" :key="instance.id">
                    <instances-item :instance="instance" />
                </li>
                <li v-if="hasMore" class="ff-show-more" @click="showMore">
                    <ChevronDoubleDownIcon class="ff-icon-sm" />
                    <p>Show More</p>
                    <ChevronDoubleDownIcon class="ff-icon-sm" />
                </li>
            </ul>
        </template>
    </ff-accordion>
</template>

<script>
import { ChevronDoubleDownIcon } from '@heroicons/vue/outline'

import FfAccordion from '../Accordion.vue'

import InstancesItem from './InstancesItem.vue'

const DISPLAY_LIMIT = 15

export default {
    name: 'VersionsList',
    components: { FfAccordion, InstancesItem, ChevronDoubleDownIcon },
    props: {
        version: {
            required: true, type: String
        },
        instances: {
            required: true, type: Array
        }
    },
    data () {
        return {
            displayLimit: DISPLAY_LIMIT
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
        },
        truncatedInstances () {
            return this.instances.slice(0, this.displayLimit)
        },
        hasMore () {
            return this.truncatedInstances.length < (this.instancesCount + this.devicesCount)
        }
    },
    methods: {
        showMore () {
            this.displayLimit += DISPLAY_LIMIT
        },
        resetCounter () {
            this.displayLimit = DISPLAY_LIMIT
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

    .instances-list {
        .ff-show-more {
            display: flex;
            gap: 15px;
            align-items: center;
            justify-content: center;
            color: $ff-grey-500;
            line-height: 30px;
            cursor: pointer;
            transition: ease-in-out .3s;

            &:hover {
                    color: $ff-color--action
            }
        }
    }
}
</style>
