<template>
    <li class="application-wrapper" :class="{'is-loading': isLoading}">
        <ApplicationHeader :application="localApplication" />

        <div class="flex flex-wrap ">
            <InstancesWrapper :application="localApplication" />

            <DevicesWrapper :application="localApplication" />
        </div>
    </li>
</template>

<script>
import ApplicationHeader from './ApplicationHeader.vue'

import DevicesWrapper from './compact/DevicesWrapper.vue'
import InstancesWrapper from './compact/InstancesWrapper.vue'

export default {
    name: 'ApplicationListItem',
    components: {
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
