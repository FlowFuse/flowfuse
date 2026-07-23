<template>
    <section
        class="tabs-wrapper drawer"
        :class="{
            open: editorImmersiveDrawer.state,
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
            <!-- Stacked view header (back button + title + optional actions) -->
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
                    <ff-button
                        v-for="(action, $key) in stackedActions"
                        :key="action.label + $key"
                        :kind="action.kind ?? 'secondary'"
                        :disabled="typeof action.disabled === 'function' ? action.disabled() : action.disabled"
                        :has-left-icon="!!action.iconLeft"
                        v-bind="action.bind"
                        :title="typeof action.tooltip === 'function' ? action.tooltip() : action.tooltip"
                        @click="action.handler"
                    >
                        <template v-if="!!action.iconLeft" #icon-left>
                            <component :is="action.iconLeft" />
                        </template>
                        {{ action.label }}
                    </ff-button>
                    <button
                        title="Close drawer"
                        type="button"
                        class="drawer-header-btn"
                        aria-label="Close drawer"
                        @click="drawersStore.toggleEditorImmersiveDrawer"
                    >
                        <XMarkIcon class="ff-btn--icon" />
                    </button>
                </div>
            </div>

            <!-- Default header (tabs + actions) -->
            <div v-if="!hasStackedView" class="header">
                <div class="logo">
                    <router-link
                        v-if="homeRoute"
                        title="Back to overview"
                        :to="homeRoute"
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
                        <XMarkIcon class="ff-btn--icon" />
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
import { HomeIcon, XMarkIcon } from '@heroicons/vue/20/solid'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, watch } from 'vue'

import getAppOrchestrator from '../../services/app.orchestrator'
import ResizeBar from '../ResizeBar.vue'

import EditorDrawerSettings from './EditorDrawerSettings.vue'

import { useImmersiveDrawer } from '@/composables/ImmersiveDrawer'
import { useContextStore } from '@/stores/context.js'

const props = defineProps({
    navigation: {
        type: Array,
        default: () => []
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

const contextStore = useContextStore()
const { editorEntityType } = storeToRefs(contextStore)

const {
    drawersStore,
    editorImmersiveDrawer,
    isResizing: isEditorResizing,
    drawerStyle,
    hasStackedView,
    currentStackView,
    stackedActions,
    startResize: startEditorResize
} = useImmersiveDrawer({ onResizingChange: resizing => emit('resizing', resizing) })

const homeRoute = computed(() => {
    if (!props.entity?.id) return null
    return {
        name: editorEntityType.value === 'device' ? 'device-overview' : 'instance-overview',
        params: { id: props.entity.id }
    }
})

function notifyDrawerState () {
    if (!props.entity) return

    const iframe = window.frames['immersive-editor-iframe']
    if (!iframe) return

    const targetOrigin = props.entity.url || window.location.origin
    const serviceOrchestrator = getAppOrchestrator()
    serviceOrchestrator.$services.postMessage.sendMessage({
        message: {
            type: 'drawer-state',
            payload: { open: editorImmersiveDrawer.value.state }
        },
        target: iframe,
        targetOrigin
    })
}

watch(() => editorImmersiveDrawer.value.state, () => {
    nextTick(notifyDrawerState)
})

onMounted(() => {
    nextTick(notifyDrawerState)
})

defineExpose({ notifyDrawerState })
</script>
