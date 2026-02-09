<template>
    <div :data-type="`${isImmersiveEditor ? 'immersive' : 'standard'}-editor`">
        <slot name="default">
            <!-- Minimal view: simple icon-only button (used in InstanceTile) -->
            <ff-button
                v-if="minimalView"
                v-ff-tooltip:left="(editorDisabled || disabled) ? disabledReason : undefined"
                kind="tertiary"
                data-action="open-editor"
                :disabled="buttonDisabled"
                class="whitespace-nowrap ff-btn-icon editor-link-minimal"
                :emit-instead-of-navigate="true"
                @click.stop.prevent="openEditor"
                @click.middle.stop.prevent="openEditor"
            >
                <template #icon-left>
                    <ProjectIcon />
                </template>
            </ff-button>

            <!-- Full view: split dropdown button -->
            <HeadlessUIMenu v-else v-slot="{ open }" as="div" class="editor-link-split" :class="{ 'editor-link-split--primary': primary }">
                <span v-if="syncOpenState(open)" class="hidden" />
                <button
                    v-ff-tooltip:left="buttonDisabled ? disabledReason : undefined"
                    class="editor-link-split__action"
                    :class="{ 'editor-link-split--disabled': buttonDisabled }"
                    data-action="open-editor"
                    :disabled="buttonDisabled"
                    @click.stop.prevent="openEditor"
                    @click.middle.stop.prevent="openEditor"
                >
                    <ProjectIcon class="ff-btn--icon" />
                    <span class="hidden sm:inline editor-link-text">{{ editorDisabled ? 'Editor Disabled' : 'Open Editor' }}</span>
                </button>
                <MenuButton
                    ref="trigger"
                    class="editor-link-split__toggle"
                    :class="{ 'editor-link-split--disabled': instanceLinkDisabled }"
                    :disabled="instanceLinkDisabled"
                    @click.stop="() => { $nextTick(() => { updateItemsPosition() }) }"
                >
                    <ChevronDownIcon class="ff-btn--icon" />
                </MenuButton>

                <teleport to="body">
                    <transition name="fade">
                        <MenuItems
                            v-if="open"
                            ref="menu-items"
                            class="z-[1000] fixed bg-white rounded overflow-hidden shadow-lg ring-1 ring-black ring-opacity-10 focus:outline-none"
                            :style="teleportedStyle"
                        >
                            <div>
                                <MenuItem v-slot="{ active }">
                                    <a
                                        :href="editorURL"
                                        :class="[active ? 'bg-gray-200' : '', 'block px-4 py-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap']"
                                        data-action="open-instance"
                                        @click.prevent="openInstance"
                                    >
                                        Open Direct URL
                                    </a>
                                </MenuItem>
                            </div>
                        </MenuItems>
                    </transition>
                </teleport>
            </HeadlessUIMenu>
        </slot>
    </div>
</template>

<script>

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/solid'
import SemVer from 'semver'

import { mapState } from 'vuex'

import ProjectIcon from '../../../components/icons/Projects.js'
import { useNavigationHelper } from '../../../composables/NavigationHelper.js'
import TeleportedMenuMixin from '../../../mixins/TeleportedMenuMixin.js'

export default {
    name: 'InstanceEditorLink',
    components: {
        ProjectIcon,
        HeadlessUIMenu: Menu,
        MenuButton,
        MenuItem,
        MenuItems,
        ChevronDownIcon
    },
    mixins: [TeleportedMenuMixin],
    inheritAttrs: false,
    props: {
        editorDisabled: {
            default: false,
            type: Boolean
        },
        disabled: {
            default: false,
            type: Boolean
        },
        disabledReason: {
            default: null,
            type: String
        },
        instance: {
            type: Object,
            required: true
        },
        showText: {
            default: true,
            type: Boolean
        },
        minimalView: {
            type: Boolean,
            default: false
        },
        primary: {
            type: Boolean,
            default: false
        }
    },
    setup () {
        const { openInANewTab, navigateTo } = useNavigationHelper()

        return {
            openInANewTab,
            navigateTo
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        isImmersiveEditor () {
            // Immersive Editor only available for:
            // - Node-RED 4.0.2+
            // - Launcher 2.6.0+
            const validNR = SemVer.satisfies(this.instance?.meta?.versions?.['node-red'], '>=4.0.2', { includePrerelease: true })
            const validLauncher = SemVer.satisfies(SemVer.coerce(this.instance?.meta?.versions?.launcher), '>=2.6.0')
            return validNR && validLauncher
        },
        url () {
            if (this.isImmersiveEditor) {
                return this.$router.resolve({ name: 'instance-editor', params: { id: this.instance.id } }).fullPath
            }

            return this.editorURL
        },
        editorURL () {
            return this.instance.url || this.instance.editor?.url
        },
        buttonDisabled () {
            return this.editorDisabled || this.disabled || !this.url
        },
        instanceLinkDisabled () {
            return this.disabled || !this.editorURL
        },
        teleportedStyle () {
            const triggerEl = this.$refs.trigger?.$el
            const triggerRight = triggerEl ? triggerEl.getBoundingClientRect().right : 0
            return {
                top: (this.position.top + 10) + 'px',
                right: (window.innerWidth - triggerRight) + 'px'
            }
        }
    },
    methods: {
        openEditor (evt) {
            if (this.buttonDisabled) {
                return false
            }

            const target = { target: `_${this.instance.id}` }

            if (!this.isImmersiveEditor) {
                return this.navigateTo(this.editorURL, evt, target)
            }

            return this.navigateTo({ name: 'instance-editor', params: { id: this.instance.id } }, evt, target)
        },
        openInstance (evt) {
            if (this.instanceLinkDisabled) {
                return false
            }
            return this.navigateTo(this.editorURL, evt, { target: `_${this.instance.id}` })
        }
    }
}
</script>

<style scoped lang="scss">
// Split dropdown button: two halves styled as one cohesive element
.editor-link-split {
    display: inline-flex;
    position: relative;
}

// Shared base styles for both halves (mirrors .ff-btn .ff-btn--secondary)
.editor-link-split__action,
.editor-link-split__toggle {
    display: flex;
    align-items: center;
    gap: $ff-unit-xs;
    font-size: $ff-funit-sm;
    font-weight: 600;
    line-height: 20px;
    background-color: $ff-white;
    color: $ff-color--action;
    border: 1px solid $ff-color--action;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;

    &:hover:not(:disabled) {
        background-color: $ff-color--highlight;
        border-color: $ff-color--highlight;
        color: $ff-white;
    }

    &:disabled,
    &.editor-link-split--disabled {
        cursor: not-allowed;
        border-color: $ff-grey-300;
        color: $ff-grey-400;
        background-color: $ff-grey-50;
    }

    .ff-btn--icon {
        width: 20px;
        height: 20px;
    }
}

// Left half: main action button
.editor-link-split__action {
    padding: $ff-unit-sm 12px $ff-unit-sm $ff-unit-sm;
    border-radius: $ff-unit-sm 0 0 $ff-unit-sm;
    border-right: none;
    white-space: nowrap;
}

// Right half: chevron dropdown trigger (square)
.editor-link-split__toggle {
    justify-content: center;
    padding: $ff-unit-sm;
    border-radius: 0 $ff-unit-sm $ff-unit-sm 0;
    border-left: 1px solid $ff-color--action;

    .ff-btn--icon {
        width: 20px;
        height: 20px;
    }

    &:hover:not(:disabled) {
        border-left-color: $ff-color--highlight;
    }

    &:disabled,
    &.editor-link-split--disabled {
        border-left-color: $ff-grey-300;
    }
}

// Primary variant: filled indigo background with white text
.editor-link-split--primary {
    .editor-link-split__action,
    .editor-link-split__toggle {
        background-color: $ff-color--action;
        border-color: $ff-color--action;
        color: $ff-white;

        &:hover:not(:disabled) {
            background-color: $ff-color--highlight;
            border-color: $ff-color--highlight;
        }
    }

    .editor-link-split__toggle {
        border-left-color: rgba($ff-white, 0.3);

        &:hover:not(:disabled) {
            border-left-color: rgba($ff-white, 0.3);
        }
    }
}

// Icon-only minimal button: remove icon margins added by .ff-btn--icon-left
.editor-link-minimal :deep(.ff-btn--icon-left) {
    margin-left: 0;
    margin-right: 0;
}

// Container query for drawer context - responsive button behavior
// Breakpoint matches DRAWER_MOBILE_BREAKPOINT constant in Editor/index.vue
// When inside drawer, respond to drawer width instead of viewport
@container drawer (min-width: 640px) {
  .editor-link-text {
    display: inline;
  }
}

@container drawer (max-width: 639px) {
  .editor-link-text {
    display: none;
  }
}
</style>
