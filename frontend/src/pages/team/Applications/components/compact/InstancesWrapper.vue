<template>
    <section v-if="hasNoInstances" class="ff-no-data--boxed">
        <label class="delimiter">
            <IconNodeRedSolid class="ff-icon ff-icon-sm text-red-800" /> Instances
        </label>
        <span v-if="!isSearching" class="message">
            This Application currently has no
            <router-link :to="`/application/${application.id}/instances`" class="ff-link">
                attached Node-RED Instances
            </router-link>
            .
        </span>
        <span v-else class="message">
            No instance matches your criteria.
        </span>
    </section>
    <section v-else class="ff-applications-list-instances--compact">
        <label class="delimiter">
            <IconNodeRedSolid class="ff-icon ff-icon-sm text-red-800" /> Instances
        </label>
        <div class="items-wrapper" :class="{one: singleInstance, two: twoInstances, three: threeInstances}" data-el="application-instances">
            <div
                v-for="instance in instances"
                :key="instance.id"
                data-el="application-instance-item"
                class="item-wrapper"
            >
                <InstanceTile :instance="instance" @delete-instance="$emit('delete-instance', $event)" />
            </div>
            <div v-if="hasMoreInstances" class="has-more item-wrapper">
                <router-link :to="{name: 'ApplicationInstances', params: {id: application.id}}">
                    <span>
                        {{ remainingInstances }}
                        More...
                    </span>
                    <ChevronRightIcon class="ff-icon" />
                </router-link>
            </div>
        </div>
    </section>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/solid'

import IconNodeRedSolid from '../../../../../components/icons/NodeRedSolid.js'

import InstanceTile from './InstanceTile.vue'

export default {
    name: 'InstancesWrapper',
    components: { ChevronRightIcon, IconNodeRedSolid, InstanceTile },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        },
        isSearching: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    emits: ['delete-instance'],
    computed: {
        instances () {
            return this.application.instances.slice(0, 3)
        },
        hasMoreInstances () {
            return this.application.instanceCount > this.instances.length
        },
        hasNoInstances () {
            return this.instances.length === 0
        },
        remainingInstances () {
            if (this.hasNoInstances || this.hasMoreInstances) {
                return this.application.instanceCount - this.instances.length
            } else return 0
        },
        singleInstance () {
            return this.application.instanceCount === 1
        },
        twoInstances () {
            return this.application.instanceCount === 2
        },
        threeInstances () {
            return this.application.instanceCount === 3
        }
    }
}
</script>
