<template>
    <input
        type="text"
        placeholder="Search through your team (CTRL + K)"
        class="input-trigger"
        @focusin="interacted"
        @click="interacted"
    >
    <span class="icon-trigger" @click="interacted">
        <SearchIcon class="ff-icon ff-icon-md" />
    </span>
</template>

<script>
import { SearchIcon } from '@heroicons/vue/outline'

export default {
    name: 'SearchTrigger',
    components: { SearchIcon },
    emits: ['interacted'],
    methods: {
        interacted () {
            this.$emit('interacted')
        }
    }
}
</script>

<style lang="scss">
#global-search {
    .input-trigger {
        display: block;
    }
    .icon-trigger {
        display: none;
        cursor: pointer;
        padding: 5px;
        transition: ease-in-out .1s;
        object-fit: contain;
    }
    .ff-icon-sm.search {
        display: none;
    }

    &.focused {
        .input-trigger, .icon-trigger {
            display: none;
        }
    }

}
@media screen and (max-width: 1023px) {
    #global-search {
        .input-trigger {
            display: none;
        }
        .icon-trigger {
            display: inline-block;
            align-self: flex-end;

            &:hover {
                will-change: transform ;
                transform: scale(1.25) translateZ(0); /* Using slight adjustments to whole values */
                backface-visibility: hidden;
                perspective: 1000px;
                stroke-width: 1.5px;
                shape-rendering: geometricPrecision;
                text-rendering: geometricPrecision;
                color: $ff-indigo-500;
            }
        }
    }
}

//@media screen and (max-width: 639px) {
//    #global-search {
//        .content-wrapper {
//            .search-wrapper {
//                .input-wrapper {
//                    flex-direction: row
//                }
//            }
//        }
//    }
//}
</style>
