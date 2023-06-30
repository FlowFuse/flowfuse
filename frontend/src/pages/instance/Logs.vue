<template>
    <div class="mb-3">
        <SectionTopMenu hero="Node-RED Logs" info="">
            <template v-if="instance.ha?.replicas != undefined" #tools>
                <div style="display: flex;align-items: center;">
                    <div class="mr-2"><strong>Replica:</strong></div>
                    <ff-dropdown ref="dropdown" v-model="selectedHAId" data-el="select-ha-replica">
                        <ff-dropdown-option label="All" value="all" />
                        <ff-dropdown-option
                            v-for="id in haIds" :key="id"
                            :label="id" :value="id"
                        />
                    </ff-dropdown>
                </div>
            </template>
        </SectionTopMenu>
    </div>
    <LogsShared :instance="instance" :filter="selectedHAId" @ha-instance-detected="newHAId" />
</template>

<script>
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import LogsShared from './components/InstanceLogs.vue'

export default {
    name: 'InstanceLogs',
    components: {
        LogsShared,
        SectionTopMenu
    },
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            haIds: [],
            selectedHAId: 'all'
        }
    },
    methods: {
        newHAId (id) {
            if (!this.haIds.includes(id)) {
                this.haIds.push(id)
            }
        }
    }
}
</script>
