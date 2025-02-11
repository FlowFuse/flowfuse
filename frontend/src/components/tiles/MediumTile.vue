<template>
    <section class="ff-medium-tile flex gap-7" :class="{ribbon: hasRibbon}" data-el="medium-tile">
        <div v-if="hasRibbon" class="ff-ribbon" :class="{ red: ribbonColor === 'red', blue: ribbonColor ==='blue' }" data-el="ribbon">
            <slot name="ribbon">{{ ribbon }}</slot>
        </div>

        <div v-if="hasImage" class="ff-image">
            <slot name="image">
                <img alt="tile-image" class="w-36 m-auto" :src="imagePath">
            </slot>
        </div>

        <div v-if="hasTitle" class="title">
            <h3 class="text-2xl">{{ title }}</h3>
        </div>

        <div v-if="hasContent" class="ff-content space-y-2 flex flex-col gap-5">
            <slot name="content">
                <ff-markdown-viewer :content="content" />
            </slot>
        </div>

        <div v-if="hasCTA" class="call-to-action">
            <slot name="call-to-action" />
        </div>
    </section>
</template>

<script>
export default {
    name: 'MediumTile',
    props: {
        ribbon: {
            type: String,
            default: ''
        },
        imagePath: {
            type: String,
            default: ''
        },
        callToAction: {
            type: String,
            default: ''
        },
        title: {
            type: String,
            required: false,
            default: ''
        },
        content: {
            type: String,
            required: false,
            default: ''
        },
        ribbonColor: {
            type: String,
            required: false,
            default: 'blue' // ['red', 'blue']
        }
    },
    computed: {
        hasRibbon () {
            return this.$slots.ribbon || this.ribbon.length
        },
        hasImage () {
            return this.$slots.image || this.imagePath.length
        },
        hasCTA () {
            return this.$slots['call-to-action'] || this.callToAction.length
        },
        hasTitle () {
            return this.$slots.title || this.title.length
        },
        hasContent () {
            return this.$slots.content || this.content.length
        }
    }
}
</script>

<style scoped lang="scss">
.ff-medium-tile {
    position: relative;
    border-radius: 6px;
    border: 2px solid $ff-grey-300;
    background: white;
    box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.25);
    padding: 49px 24px 24px 24px;
    width: 100%;
    max-width: 300px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .ff-ribbon {
        --ribbon-overlap: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 30px;
        left: calc(-1 * var(--ribbon-overlap));
        line-height: 1.3;
        width: calc(100% + 2 * var(--ribbon-overlap));
        margin: 0;
        position: absolute;
        top: 8px;
        color: white;
        border-top: 1px solid #363636;
        border-bottom: 1px solid #202020;
        border-radius: 2px 2px 0 0;
        box-shadow: 0 1px 2px rgba(0,0,0,0.3);

        &.red {
            background: $ff-red-500;
            &::before,
            &::after {
                border-color: $ff-red-900 transparent transparent transparent;
            }
        }

        &.blue {
            background: $ff-indigo-700;
            &::before,
            &::after {
                border-color: $ff-indigo-900 transparent transparent transparent;
            }
        }

        &::before,
        &::after {
            content: '';
            display: block;
            width: 0;
            height: 0;
            position: absolute;
            bottom: calc((-2 * var(--ribbon-overlap)) - 1px);
            z-index: -10;
            border: var(--ribbon-overlap) solid;
        }

        &::before {left: 0}
        &::after {right: 0}
    }

}
</style>
