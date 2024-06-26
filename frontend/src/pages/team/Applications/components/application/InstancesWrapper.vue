<template>
    <div v-if="instances.length === 0" class="ff-no-data">
        This Application currently has no <router-link :to="`/application/${application.id}/instances`" class="ff-link">attached Node-RED Instances</router-link>.
    </div>
    <component :is="listComponent" v-else data-el="application-instances">
        <label>Instances</label>
        <div
            v-for="instance in instances"
            :key="instance.id"
            data-el="application-instance-item"
            @click.stop="openInstance(instance)"
        >
            <component :is="applicationComponent" :instance="instance" @instance-deleted="$emit('instance-deleted')" />
        </div>
    </component>
    <div v-if="hasMoreItems" class="ff-applications-list--details">
        Only the {{ instances.length }} <router-link :to="`/application/${application.id}/instances`" class="ff-link">instances</router-link>  with the most recent activity are being displayed.
    </div>
</template>

<script>
import { markRaw } from 'vue'

import CompactApplicationInstance from './compact/ApplicationInstance.vue'
import CompactList from './compact/CompactList.vue'
import WideApplicationInstance from './wide/ApplicationInstance.vue'
import WideList from './wide/WideList.vue'

export default {
    name: 'InstancesWrapper',
    components: { WideList, CompactList, WideApplicationInstance },
    props: {
        application: {
            type: Object,
            required: true,
            default: null
        },
        viewMode: {
            type: String,
            required: false,
            default: 'wide'
        }
    },
    emits: ['instance-deleted'],
    data () {
        return {
            listComponents: {
                wide: markRaw(WideList),
                compact: markRaw(CompactList)
            },
            applicationComponents: {
                wide: markRaw(WideApplicationInstance),
                compact: markRaw(CompactApplicationInstance)
            }
        }
    },
    computed: {
        instances () {
            return Array.from(this.application.instances.values())
        },
        hasMoreItems () {
            return this.application.instanceCount > this.instances.length
        },
        listComponent () {
            return this.listComponents[this.viewMode]
        },
        applicationComponent () {
            return this.applicationComponents[this.viewMode]
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
