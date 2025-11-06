<template>
    <div class="expert-button-wrapper flex items-center justify-center h-full px-3" style="height: 60px;">
        <button
            class="expert-button flex items-center gap-1.5 justify-center rounded-md px-[9px] py-[6px] font-bold text-[0.85rem] leading-[20px] text-gray-800 whitespace-nowrap transition-colors"
            data-el="expert-button"
            data-click-exclude="right-drawer"
            @click="onClick"
        >
            <img src="/ff-minimal-red.svg" alt="FlowFuse" class="w-5 h-5 -ml-1 mr-0.5 flex-shrink-0">
            <span>Expert</span>
        </button>
    </div>
</template>

<script>
import { mapActions, mapState } from 'vuex'

export default {
    name: 'ExpertButton',
    components: {},
    computed: {
        ...mapState('ux/drawers', ['rightDrawer'])
    },
    methods: {
        ...mapActions('ux/drawers', ['closeRightDrawer']),
        ...mapActions('product/expert', ['openAssistantDrawer']),
        onClick () {
            this.openAssistantDrawer()
        }
    }
}
</script>

<style scoped lang="scss">
/* Hide the ::after divider that the header navigation adds to all children */
.expert-button-wrapper::after {
    display: none !important;
}

/* Dual-background gradient border technique from flowfuse.com */
.expert-button {
    background: linear-gradient(white, white) padding-box,
                linear-gradient(135deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    border: 1px solid transparent;
    animation: gradient-border-rotate 4s linear infinite;

    &:hover {
        background: linear-gradient(#f9fafb, #f9fafb) padding-box,
                    linear-gradient(135deg, $ff-red-700, #4038d5, $ff-red-700) border-box;
    }
}

@keyframes gradient-border-rotate {
    0% {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(0deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    }
    10% {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(36deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    }
    20% {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(72deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    }
    30% {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(108deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    }
    40% {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(144deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    }
    50% {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(180deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    }
    60% {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(216deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    }
    70% {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(252deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    }
    80% {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(288deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    }
    90% {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(324deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    }
    100% {
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(360deg, $ff-red-600, #5048e5, $ff-red-600) border-box;
    }
}
</style>
