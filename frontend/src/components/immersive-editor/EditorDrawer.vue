<template>
    <section
        class="tabs-wrapper drawer"
        :class="{
            open: editorImmersiveDrawer.open,
            pinned: editorImmersiveDrawer.pinned,
            resizing: isEditorResizing,
            'side-left': editorImmersiveDrawer.side === 'left',
            'side-right': editorImmersiveDrawer.side === 'right'
        }"
        :style="drawerStyle"
        data-el="tabs-drawer"
    >
        <resize-bar
            :is-resizing="isEditorResizing"
            @mousedown="startEditorResize"
        />

        <div class="drawer-content">
            <!-- Stacked view header (back button + title) -->
            <div v-if="hasStackedView && currentStackView.title" class="header header--stacked">
                <button
                    class="drawer-header-btn"
                    title="Back"
                    type="button"
                    @click="drawersStore.popEditorImmersiveView"
                >
                    <ArrowLeftIcon class="ff-btn--icon" />
                </button>
                <span class="editor-drawer-stack-title">{{ currentStackView.title }}</span>
                <div class="side-actions">
                    <button
                        title="Close drawer"
                        type="button"
                        class="drawer-header-btn"
                        aria-label="Close drawer"
                        @click="drawersStore.toggleEditorImmersiveDrawer"
                    >
                        <XIcon class="ff-btn--icon" />
                    </button>
                </div>
            </div>

            <!-- Default header (tabs + actions) -->
            <div v-if="!hasStackedView" class="header">
                <div class="logo">
                    <router-link
                        v-if="props.homeRoute"
                        title="Back to overview"
                        :to="props.homeRoute"
                    >
                        <HomeIcon class="ff-btn--icon" style="width: 18px; height: 18px;" />
                    </router-link>
                </div>

                <ff-tabs v-if="props.navigation.length" :tabs="props.navigation" class="tabs" />

                <div class="side-actions">
                    <slot name="actions" />

                    <EditorDrawerSettings />

                    <button
                        title="Close drawer"
                        type="button"
                        class="drawer-header-btn"
                        aria-label="Close drawer"
                        @click="drawersStore.toggleEditorImmersiveDrawer"
                    >
                        <XIcon class="ff-btn--icon" />
                    </button>
                </div>
            </div>

            <!-- Stacked view content (with header = wrap in ff-page) -->
            <ff-page v-if="hasStackedView && currentStackView.title" :no-padding="true">
                <component
                    :is="currentStackView.component"
                    v-bind="currentStackView.props"
                    v-on="currentStackView.events || {}"
                />
            </ff-page>

            <!-- Stacked view content (no header = component manages its own chrome) -->
            <component
                :is="currentStackView.component"
                v-else-if="hasStackedView"
                v-bind="currentStackView.props"
                v-on="currentStackView.events || {}"
            />

            <!-- Default tab content -->
            <ff-page v-else :no-padding="props.isExpertRoute">
                <slot />
            </ff-page>
        </div>
    </section>
</template>

<script setup>
import { ArrowLeftIcon } from '@heroicons/vue/outline'
import { HomeIcon, XIcon } from '@heroicons/vue/solid'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { getServiceFactory } from '../../services/service.factory.js'
import ResizeBar from '../ResizeBar.vue'

import EditorDrawerSettings from './EditorDrawerSettings.vue'

import { useUxDrawersStore } from '@/stores/ux-drawers.js'

const DRAWER_MIN_WIDTH = 310
const DRAWER_MAX_VIEWPORT_MARGIN = 200
const DRAWER_MAX_WIDTH_RATIO = 0.9

const props = defineProps({
    navigation: {
        type: Array,
        default: () => []
    },
    homeRoute: {
        type: Object,
        default: null
    },
    isExpertRoute: {
        type: Boolean,
        default: false
    },
    entity: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['resizing'])

const drawersStore = useUxDrawersStore()
const { editorImmersiveDrawer } = storeToRefs(drawersStore)
const route = useRoute()

const resizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)
const windowWidth = ref(window.innerWidth)

const isEditorResizing = computed(() => resizing.value)

const drawerStyle = computed(() => {
    if (!editorImmersiveDrawer.value.open) return {}
    const width = Math.min(
        editorImmersiveDrawer.value.width,
        windowWidth.value * DRAWER_MAX_WIDTH_RATIO,
        windowWidth.value - DRAWER_MAX_VIEWPORT_MARGIN
    )
    return { width: `${width}px`, order: editorImmersiveDrawer.value.side === 'right' ? 1 : -1 }
})

const hasStackedView = computed(() => editorImmersiveDrawer.value.viewStack.length > 0)
const currentStackView = computed(() => {
    const stack = editorImmersiveDrawer.value.viewStack
    return stack[stack.length - 1] || null
})

function notifyDrawerState () {
    if (!props.entity) return

    const iframe = window.frames['immersive-editor-iframe']
    if (!iframe) return

    const targetOrigin = props.entity.url || window.location.origin
    const serviceFactory = getServiceFactory()
    serviceFactory.$serviceInstances.messaging.sendMessage({
        message: {
            type: 'drawer-state',
            payload: { open: editorImmersiveDrawer.value.open }
        },
        target: iframe,
        targetOrigin
    })
}

function handleResize (e) {
    if (!resizing.value) return

    const isLeftSide = editorImmersiveDrawer.value.side === 'left'
    const delta = isLeftSide
        ? e.clientX - startX.value
        : startX.value - e.clientX

    const newWidth = Math.min(
        Math.max(DRAWER_MIN_WIDTH, startWidth.value + delta),
        window.innerWidth * DRAWER_MAX_WIDTH_RATIO,
        window.innerWidth - DRAWER_MAX_VIEWPORT_MARGIN
    )

    drawersStore.setEditorImmersiveDrawerWidth(newWidth)
}

function stopResize () {
    resizing.value = false
    emit('resizing', false)
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
}

function startEditorResize (e) {
    resizing.value = true
    emit('resizing', true)
    startX.value = e.clientX
    startWidth.value = editorImmersiveDrawer.value.width

    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)
}

function onWindowResize () {
    windowWidth.value = window.innerWidth
}

watch(() => editorImmersiveDrawer.value.open, () => {
    nextTick(notifyDrawerState)
})

watch(() => route.name, () => {
    drawersStore.clearEditorImmersiveViewStack()
})

onMounted(() => {
    drawersStore.setEditorImmersiveActive(true)
    window.addEventListener('resize', onWindowResize)
    nextTick(notifyDrawerState)
})

onUnmounted(() => {
    drawersStore.setEditorImmersiveActive(false)
    drawersStore.clearEditorImmersiveViewStack()
    window.removeEventListener('resize', onWindowResize)
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
})

defineExpose({ notifyDrawerState })
</script>

<style lang="scss">
.ff--immersive-editor-wrapper .tabs-wrapper.drawer {
    &.pinned {
        position: relative;
        left: auto;
        top: auto;
        height: 100%;
        transform: none;
        box-shadow: none;

        &.open {
            border-right: 1px solid $ff-grey-200;

            &.side-right {
                border-right: none;
                border-left: 1px solid $ff-grey-200;
            }
        }
    }

    &:not(.pinned).side-right {
        left: auto;
        right: 0;
        transform: translateX(100%);

        &.open {
            transform: translateX(0);
            box-shadow: -5px 0 8px rgba(0, 0, 0, 0.10);
        }
    }

    .ff-layout--immersive--fullscreen &:not(.pinned) {
        top: 0;
        height: 100%;
    }

    &.side-right .resize-bar {
        left: 0;
        right: auto;
        border-right: none;
        border-left: 1px solid $ff-grey-400;

        &::before {
            left: -3px;
        }
    }

    // Stacked view header
    .header--stacked {
        min-height: 46px;
    }

    .drawer-header-btn {
        align-self: stretch;
        background: none;
        border: none;
        padding: 0 15px;
        color: $ff-grey-500;
        font: inherit;
        display: flex;
        align-items: center;
        cursor: pointer;
        transition: all 0.2s ease;

        .ff-btn--icon {
            width: 18px;
            height: 18px;
        }

        &:hover {
            background: $ff-grey-100;
            color: $ff-grey-700;
        }

        &:active {
            background: $ff-grey-200;
        }
    }

    .editor-drawer-stack-title {
        flex: 1;
        font-weight: 600;
        font-size: 14px;
        color: $ff-grey-800;
        padding: 0 10px;
        display: flex;
        align-items: center;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>
