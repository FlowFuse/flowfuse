<template>
    <div id="global-search" :class="{focused: isFocused}">
        <div class="global-search-wrapper">
            <div v-if="isFocused" class="overlay" @click="deFocus" />
            <div class="input-wrapper">
                <SearchIcon class="ff-icon-sm search" />

                <input
                    v-model="search"
                    type="text"
                    placeholder="Search FlowFuse"
                    @focusin="focus"
                    @click="focus"
                >

                <transition name="fade" mode="out-in">
                    <XIcon v-if="search.length" class="ff-icon-sm close cursor-pointer" @click="resetSearch" />
                </transition>
            </div>
        </div>
    </div>
</template>

<script>
import { SearchIcon, XIcon } from '@heroicons/vue/outline'

export default {
    name: 'GlobalSearch',
    components: { SearchIcon, XIcon },
    data () {
        return {
            search: '',
            isFocused: false
        }
    },
    methods: {
        resetSearch () {
            this.search = ''
        },
        onEscKeyPress () {
            this.deFocus()
            this.resetSearch()
        },
        focus () {
            document.addEventListener('keydown', this.handleEscapeKey)
            this.isFocused = true
        },
        deFocus () {
            document.removeEventListener('keydown', this.handleEscapeKey)
            this.isFocused = false
        },
        handleEscapeKey (event) {
            if (event.key === 'Escape') {
                this.onEscKeyPress()
            }
        }
    }
}
</script>

<style scoped lang="scss">
#global-search {
    padding: 0 5px;
    display: flex;
    flex: 1;
    justify-content: flex-end;

    .global-search-wrapper {
        .input-wrapper {
            padding: 5px 10px;
            position: relative;
            transition: ease-in-out width .3s;
            display: flex;
            justify-content: flex-end;

            .ff-icon-sm {
                color: white;
                position: absolute;
                z-index: 1;
                top: 10px;

                &.search {
                    left: 15px;
                }

                &.close {
                    right: 15px;
                }
            }

            input {
                color: $ff-grey-500;
                text-indent: 20px;
                background: $ff-grey-700;
                border-color: $ff-grey-500;
                min-width: 25vw;
            }
        }
    }

    &.focused {
        .global-search-wrapper {
            .input-wrapper {
                position: fixed;
                width: 60vw;
                background: white;
                top: 10px;
                left: 25%;
                z-index: 120;
                border: 1px solid  $ff-grey-500;
                border-radius: 5px;

                .ff-icon-sm {
                    color: $ff-grey-500;
                }

                input {
                    flex: 1;
                    background: white;
                }
            }

            .overlay {
                position: absolute;
                width: 100vw;
                height: 100vh;
                background: rgba(0,0,0,.3);
                left: 0;
                top: 0;
                z-index: 110;
            }
        }
    }

}
</style>
