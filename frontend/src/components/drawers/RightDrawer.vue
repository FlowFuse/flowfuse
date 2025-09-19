<template>
    <section
        id="right-drawer"
        v-click-outside="{handler: closeDrawer, exclude: ['right-drawer']}"
        :class="{open: rightDrawer.state, wider: rightDrawer.wider}"
        data-el="right-drawer"
    >
        <div v-if="rightDrawer?.header" class="header flex items-center justify-between p-4 border-b gap-2">
            <div class="title clipped-overflow">
                <h1 class="text-xl font-semibold mb-0" :title="rightDrawer.header.title">{{ rightDrawer.header.title }}</h1>
            </div>
            <div class="actions flex flex-row gap-2">
                <ff-button
                    v-for="(action, $key) in actions"
                    :key="action.label + $key"
                    :kind="action.kind ?? 'secondary'"
                    :disabled="typeof action.disabled === 'function' ? action.disabled() : action.disabled"
                    :has-left-icon="!!action.iconLeft"
                    @click="action.handler"
                >
                    <template v-if="!!action.iconLeft" #icon-left>
                        <component :is="action.iconLeft" />
                    </template>
                    {{ action.label }}
                </ff-button>
            </div>
        </div>
        <component
            :is="rightDrawer.component"
            v-if="rightDrawer.component"
            v-bind="rightDrawer.props"
            v-on="rightDrawer.on ?? {}"
        />
    </section>
</template>

<script>
import { mapActions, mapState } from 'vuex'

export default {
    name: 'RightDrawer',
    computed: {
        ...mapState('ux/drawers', ['rightDrawer']),
        actions () {
            return (this.rightDrawer?.header?.actions ?? [])
                .filter(action => {
                    if (typeof action.hidden === 'function') {
                        return !action.hidden()
                    }

                    return !action.hidden
                })
        }
    },
    watch: {
        'rightDrawer.state': {
            handler (isOpen) {
                const onEsc = (e) => e.key === 'Escape' && this.closeRightDrawer()
                isOpen ? window.addEventListener('keydown', onEsc) : window.removeEventListener('keydown', onEsc)
            }
        }
    },
    methods: {
        ...mapActions('ux/drawers', ['closeRightDrawer']),
        closeDrawer () {
            if (this.rightDrawer.state) {
                this.closeRightDrawer()
            }
        }
    }
}
</script>

<style scoped lang="scss">
#right-drawer {
    position: absolute;
    border-left: 1px solid $ff-grey-300;
    background: $ff-grey-50;
    height: calc(100% - 60px);
    top: 60px;
    right: -1000px;
    z-index: 110;
    width: 100%;
    max-width: 0;
    min-width: 0;
    transition: ease-in-out .3s;
    box-shadow: -5px 0px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: auto;

    & > * {
        padding: 1rem;
    }

    .header {
        background: white;
    }

    &.open {
        right: 0;
        width: 100%;
        max-width: 30vw;
        min-width: 400px;

        &.wider {
            max-width: 45vw;
        }
    }
}
</style>
