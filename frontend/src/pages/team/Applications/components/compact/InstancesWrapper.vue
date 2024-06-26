<template>
    <div v-if="hasNoInstances" class="ff-no-data">
        This Application currently has no
        <router-link :to="`/application/${application.id}/instances`" class="ff-link">
            attached Node-RED Instances
        </router-link>
        .
    </div>
    <section v-else class="ff-applications-list-instances--compact" data-el="application-instances">
        <label><IconNodeRedSolid class="ff-icon ff-icon-sm text-red-800" /> Instances</label>
        <div class="wrapper">
            <div
                v-for="instance in instances"
                :key="instance.id"
                data-el="application-instance-item"
                class="item-wrapper"
                @click.stop="openInstance(instance)"
            >
                <InstanceTile :instance="instance" @instance-deleted="$emit('instance-deleted')" />
            </div>
            <div v-if="hasMoreInstances" class="has-more ff-applications-list--instance">HAS MORE</div>
        </div>
    </section>
</template>

<script>
import IconNodeRedSolid from '../../../../../components/icons/NodeRedSolid.js'

import InstanceTile from './InstanceTile.vue'

export default {
    name: 'InstancesWrapper',
    components: { IconNodeRedSolid, InstanceTile },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        }
    },
    emits: ['instance-deleted'],
    computed: {
        instances () {
            return Array.from(this.application.instances.values())
        },
        hasMoreInstances () {
            return this.application.instanceCount > this.application.instances.size
        },
        hasNoInstances () {
            return this.application.instances.size === 0
        }
    },
    methods: {
        openInstance (instance) {
            this.$router.push({
                name: 'Instance',
                params: {
                    id: instance.id
                }
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
