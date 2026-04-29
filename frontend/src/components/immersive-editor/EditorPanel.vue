<template>
    <div class="editor-panel">
        <div class="editor-panel-header">
            <div class="logo">
                <router-link
                    v-if="homeRoute"
                    title="Back to overview"
                    :to="homeRoute"
                >
                    <HomeIcon class="ff-btn--icon" style="width: 18px; height: 18px;" />
                </router-link>
            </div>

            <ff-tabs v-if="navigation.length" :tabs="navigation" class="tabs" />

            <div class="side-actions">
                <slot name="actions" />

                <EditorDrawerSettings />

                <button
                    title="Close drawer"
                    type="button"
                    class="drawer-header-btn"
                    aria-label="Close drawer"
                    @click="toggleDrawer()"
                >
                    <XIcon class="ff-btn--icon" />
                </button>
            </div>
        </div>

        <ff-page :no-padding="isExpertRoute">
            <slot />
        </ff-page>
    </div>
</template>

<script setup>
import { HomeIcon, XIcon } from '@heroicons/vue/solid'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import EditorDrawerSettings from './EditorDrawerSettings.vue'

import { useContextStore } from '@/stores/context.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

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

const drawersStore = useUxDrawersStore()
const { toggleDrawer } = drawersStore
const contextStore = useContextStore()
const { editorEntityType } = storeToRefs(contextStore)

const homeRoute = computed(() => {
    if (!props.entity?.id) return null
    return {
        name: editorEntityType.value === 'device' ? 'device-overview' : 'instance-overview',
        params: { id: props.entity.id }
    }
})

</script>

<style lang="scss">
.editor-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;

    .editor-panel-header {
        padding: 0;
        display: flex;
        line-height: 1.5;
        background: $ff-grey-50;
        align-items: stretch;
        flex-shrink: 0;
        border-bottom: 1px solid $ff-grey-200;

        .logo {
            display: flex;
            align-items: center;
            padding: 0 10px;
            color: $ff-grey-500;
        }

        .tabs {
            flex: 1;
            min-width: 0;
        }

        .side-actions {
            display: flex;
            align-items: center;
            padding: 0 5px;
            color: $ff-grey-500;
            flex-shrink: 0;
            gap: 5px;
        }
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
}
</style>
