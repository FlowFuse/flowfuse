<template>
    <section
        class="tabs-wrapper drawer"
        :class="{
            open: editorImmersiveDrawer.state,
            pinned: editorImmersiveDrawer.pinned,
            resizing: isResizing,
            'side-left': editorImmersiveDrawer.side === 'left',
            'side-right': editorImmersiveDrawer.side === 'right'
        }"
        :style="drawerStyle"
        data-el="dashboard-drawer"
    >
        <resize-bar :is-resizing="isResizing" @mousedown="startResize" />

        <div class="drawer-content">
            <div v-if="hasStackedView && currentStackView.title" class="header header--stacked">
                <button class="drawer-header-btn" title="Back" type="button" @click="drawersStore.popEditorImmersiveView">
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
                        @click="action.handler"
                    >
                        <template v-if="!!action.iconLeft" #icon-left>
                            <component :is="action.iconLeft" />
                        </template>
                        {{ action.label }}
                    </ff-button>
                    <button class="drawer-header-btn" title="Close drawer" type="button" aria-label="Close drawer" @click="drawersStore.toggleEditorImmersiveDrawer">
                        <XMarkIcon class="ff-btn--icon" />
                    </button>
                </div>
            </div>

            <div v-if="!hasStackedView" class="header">
                <div class="logo">
                    <router-link v-if="homeRoute" title="Back" :to="homeRoute">
                        <HomeIcon class="ff-btn--icon" style="width: 18px; height: 18px;" />
                    </router-link>
                </div>
                <span class="dashboard-drawer--title">
                    <ChartPieIcon class="dashboard-drawer--title-icon" />
                    {{ title }}
                </span>
                <div class="side-actions">
                    <EditorDrawerSettings />
                    <button class="drawer-header-btn" title="Close drawer" type="button" aria-label="Close drawer" @click="drawersStore.toggleEditorImmersiveDrawer">
                        <XMarkIcon class="ff-btn--icon" />
                    </button>
                </div>
            </div>

            <ff-page v-if="hasStackedView && currentStackView.title" :no-padding="true">
                <component :is="currentStackView.component" v-bind="currentStackView.props" v-on="currentStackView.events || {}" />
            </ff-page>
            <component :is="currentStackView.component" v-else-if="hasStackedView" v-bind="currentStackView.props" v-on="currentStackView.events || {}" />
            <ff-page v-else :no-padding="true">
                <slot />
            </ff-page>
        </div>
    </section>
</template>

<script setup lang="ts">
import { HomeIcon, XMarkIcon } from '@heroicons/vue/20/solid'
import { ArrowLeftIcon, ChartPieIcon } from '@heroicons/vue/24/outline'

import ResizeBar from '@/components/ResizeBar.vue'
import EditorDrawerSettings from '@/components/immersive-editor/EditorDrawerSettings.vue'
import { useImmersiveDrawer } from '@/composables/ImmersiveDrawer'

defineProps({
    homeRoute: {
        type: Object,
        default: null
    },
    title: {
        type: String,
        default: 'Dashboards'
    }
})

const emit = defineEmits(['resizing'])

const {
    drawersStore,
    editorImmersiveDrawer,
    isResizing,
    drawerStyle,
    hasStackedView,
    currentStackView,
    stackedActions,
    startResize
} = useImmersiveDrawer({ onResizingChange: (resizing) => emit('resizing', resizing) })
</script>

<style scoped lang="scss">
.dashboard-drawer--title {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 8px;
    font-weight: 600;
    color: var(--ff-color-text);
}

.dashboard-drawer--title-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
}
</style>
