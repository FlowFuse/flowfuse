<template>
    <div class="ff-collapsible" :class="{ 'is-up': openUp }">
        <div class="ff-collapsible--header" @click="toggle">
            <ChevronRightIcon class="ff-collapsible--chevron" :class="{ rotated: expanded }" />
            <slot name="header" />
        </div>
        <transition :css="false" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
            <div v-if="expanded" ref="content" class="ff-collapsible--content">
                <slot />
            </div>
        </transition>
    </div>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/20/solid'

const DURATION = 220

export default {
    name: 'CollapsibleSection',
    components: { ChevronRightIcon },
    props: {
        autoOpen: {
            type: Boolean,
            default: false
        },
        forceOpen: {
            type: Boolean,
            default: false
        },
        openUp: {
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            manualExpanded: null
        }
    },
    computed: {
        expanded () {
            if (this.forceOpen) return true
            return this.manualExpanded !== null ? this.manualExpanded : this.autoOpen
        }
    },
    methods: {
        toggle () {
            if (this.forceOpen) return
            this.manualExpanded = !this.expanded
        },
        reducedMotion () {
            return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        },
        onEnter (el, done) {
            if (this.reducedMotion()) return done()
            const target = el.scrollHeight
            el.style.overflow = 'hidden'
            el.style.height = '0'
            el.style.opacity = '0'
            requestAnimationFrame(() => {
                el.style.transition = `height ${DURATION}ms ease, opacity ${DURATION}ms ease`
                el.style.height = `${target}px`
                el.style.opacity = '1'
            })
            this.onEnd(el, 'height', done)
        },
        onAfterEnter (el) {
            el.style.height = ''
            el.style.opacity = ''
            el.style.overflow = ''
            el.style.transition = ''
        },
        onLeave (el, done) {
            if (this.reducedMotion()) return done()
            el.style.overflow = 'hidden'
            el.style.height = `${el.scrollHeight}px`
            el.style.opacity = '1'
            // Force a reflow so the browser registers the start height before collapsing.
            this.forceReflow(el)
            el.style.transition = `height ${DURATION}ms ease, opacity ${DURATION}ms ease`
            el.style.height = '0'
            el.style.opacity = '0'
            this.onEnd(el, 'height', done)
        },
        forceReflow (el) {
            // Reading a layout property flushes pending style writes so the next one animates.
            return el.offsetHeight
        },
        onEnd (el, prop, done) {
            const handler = (event) => {
                if (event.target !== el || event.propertyName !== prop) return
                el.removeEventListener('transitionend', handler)
                done()
            }
            el.addEventListener('transitionend', handler)
        }
    }
}
</script>

<style scoped lang="scss">
.ff-collapsible {
    display: flex;
    flex-direction: column;

    &.is-up {
        flex-direction: column-reverse;
    }
}

.ff-collapsible--header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--ff-color-text-subtle);

    &:hover {
        color: var(--ff-color-text);
    }
}

.ff-collapsible--chevron {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    transition: transform 0.2s ease;

    &.rotated {
        transform: rotate(90deg);
    }
}
</style>
