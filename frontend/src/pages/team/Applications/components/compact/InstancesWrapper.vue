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
            <HasMoreTile
                v-if="hasMoreInstances"
                link-to="ApplicationInstances"
                :remaining="remainingInstances"
                :application="application"
                :search-query="searchQuery"
            />
        </div>
    </section>
</template>

<script>
import IconNodeRedSolid from '../../../../../components/icons/NodeRedSolid.js'

import HasMoreTile from './HasMoreTile.vue'

import InstanceTile from './InstanceTile.vue'

export default {
    name: 'InstancesWrapper',
    components: { HasMoreTile, IconNodeRedSolid, InstanceTile },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        },
        searchQuery: {
            type: String,
            required: false,
            default: ''
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
        },
        isSearching () {
            return this.searchQuery.length > 0
        }
    }
}
</script>
