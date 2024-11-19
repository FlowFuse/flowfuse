<template>
    <div id="global-search" :class="{focused: isFocused}">
        <transition name="fade" mode="out-in">
            <div v-if="isFocused" class="overlay" @click="deFocus" />
        </transition>
        <div class="content-wrapper">
            <SearchIcon class="ff-icon-sm search" />

            <input
                v-model="query"
                type="text"
                placeholder="Search FlowFuse"
                @focusin="focus"
                @click="focus"
            >

            <transition name="fade" mode="out-in">
                <XIcon v-if="query.length" class="ff-icon-sm close cursor-pointer" @click="resetSearch" />
            </transition>

            <div class="results-wrapper">
                <div v-if="resApplication.length > 0" class="section applications">
                    <p class="title">Applications</p>
                    <ul class="results">
                        <li v-for="application in resApplication" :key="application.id">
                            {{ application.name }}
                        </li>
                    </ul>
                </div>
                <div v-if="resDevices.length > 0" class="section devices">
                    <p class="title">Devices</p>
                    <ul class="results">
                        <li v-for="device in resDevices" :key="device.id">
                            {{ device.name }}
                        </li>
                    </ul>
                </div>
                <div v-if="resInstances.length > 0" class="section instances">
                    <p class="title">Instances</p>
                    <ul class="results">
                        <li v-for="instance in resInstances" :key="instance.id">
                            {{ instance.name }}
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { SearchIcon, XIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import globalApi from '../api/global.js'

export default {
    name: 'GlobalSearch',
    components: {
        SearchIcon,
        XIcon
    },
    data () {
        return {
            query: '',
            isFocused: false,
            results: []
        }
    },
    computed: {
        ...mapState('account', ['team']),
        resApplication () {
            return this.results.filter(res => res.object === 'application')
        },
        resDevices () {
            return this.results.filter(res => res.object === 'device')
        },
        resInstances () {
            return this.results.filter(res => res.object === 'instance')
        },
        hasResults () {
            return this.results.length > 0
        }
    },
    watch: {
        query (newVal) {
            if (newVal) {
                this.getData()
            }
        }
    },
    methods: {
        resetSearch () {
            this.query = ''
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
        },
        async getData () {
            return globalApi.search(this.team.id, this.query)
                .then(res => {
                    this.results = res.results
                })
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

    .content-wrapper {
        padding: 5px 10px;
        position: relative;
        transition: ease-in-out width .3s;
        justify-content: flex-end;
        display: flex;
        flex-direction: column;
        gap: 10px;

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
            padding: 3px 25px;
            background: $ff-grey-700;
            border-color: $ff-grey-500;
            min-width: 25vw;
        }

        .results-wrapper {
            background: white;
            display: none; // todo remove
            min-height: 300px;
            min-width: 100%;
            z-index: 120;
        }
    }

    &.focused {
        .content-wrapper {
            position: fixed;
            width: 60vw;
            background: white;
            top: 10px;
            left: 25%;
            z-index: 120;
            border: 1px solid $ff-grey-500;
            border-radius: 5px;

            .ff-icon-sm {
                color: $ff-grey-500;
            }

            input {
                flex: 1;
                background: white;
            }

            .results-wrapper {
                display: block; //todo remove
            }
        }

        .overlay {
            position: absolute;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, .3);
            left: 0;
            top: 0;
            z-index: 110;
        }
    }
}
</style>
