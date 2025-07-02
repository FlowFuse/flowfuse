<template>
    <li class="application-wrapper" :class="{'is-loading': isLoading}">
        <ApplicationHeader :application="localApplication" />

        <InstancesWrapper :application="localApplication" :search-query="searchQuery" @delete-instance="onInstanceDelete" />

        <DevicesWrapper :application="localApplication" :search-query="searchQuery" @delete-device="$emit('device-deleted')" />

        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="onInstanceDeleted" />

        <transition name="fade">
            <div v-if="isLoading" class="overlay flex">
                <ff-spinner v-if="isLoading" class="flex-1 self-center" />
            </div>
        </transition>
    </li>
</template>

<script>
import ConfirmInstanceDeleteDialog from '../../../instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'

import ApplicationHeader from './ApplicationHeader.vue'

import DevicesWrapper from './compact/DevicesWrapper.vue'
import InstancesWrapper from './compact/InstancesWrapper.vue'

export default {
    name: 'ApplicationListItem',
    components: {
        ConfirmInstanceDeleteDialog,
        ApplicationHeader,
        InstancesWrapper,
        DevicesWrapper
    },
    props: {
        application: {
            type: Object,
            required: true
        },
        searchQuery: {
            type: String,
            required: false,
            default: ''
        },
        isSearching: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    emits: ['instance-deleted', 'device-deleted'],
    data () {
        return {
            localApplication: null,
            isLoading: true
        }
    },
    watch: {
        application: 'setLocalApplication',
        isSearching: {
            immediate: true,
            handler (isSearching) {
                this.isLoading = isSearching
            }
        }
    },
    created () {
        this.setLocalApplication()
    },
    methods: {
        onInstanceDeleted (instance) {
            if (this.localApplication.instances.find((el) => el.id === instance.id)) {
                this.localApplication.instances = this.localApplication.instances.filter((el) => el.id !== instance.id)
                this.localApplication.instanceCount--
                this.$emit('instance-deleted')
            }
        },
        onInstanceDelete (instance) {
            this.$refs.confirmInstanceDeleteDialog.show(instance)
        },
        setLocalApplication () {
            this.localApplication = this.application
        }
    }
}
</script>

<style lang="scss" scoped>
.application-wrapper {
    position: relative;

    .overlay {
        position: absolute;
        top:0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.4) !important;
        border: none !important;
    }
}
</style>
