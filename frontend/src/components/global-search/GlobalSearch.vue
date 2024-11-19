<template>
    <div id="global-search" :class="{focused: isFocused}">
        <transition name="fade" mode="out-in">
            <div v-if="isFocused" class="overlay" @click="deFocus" />
        </transition>
        <div class="content-wrapper">
            <transition name="primary-fade" mode="out-in">
                <SpinnerIcon v-if="loading" class="ff-icon-sm search" />
                <SearchIcon v-else class="ff-icon-sm search" />
            </transition>

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

            <transition name="fade" mode="out-in">
                <div v-if="isFocused && hasResults" class="results-wrapper">
                    <div v-if="resApplication.length > 0" class="section applications">
                        <p class="title">
                            <TemplateIcon class="icon ff-icon-sm" />
                            <span class="text">Applications</span>
                            <span class="counter">({{ resApplication.length }})</span>
                        </p>
                        <ul class="results">
                            <li v-for="application in resApplication" :key="application.id">
                                {{ application.name }}
                            </li>
                        </ul>
                    </div>
                    <div v-if="resInstances.length > 0" class="section instances">
                        <p class="title">
                            <ProjectsIcon class="icon ff-icon-sm" />
                            <span class="text">Instances</span>
                            <span class="counter">({{ resInstances.length }})</span>
                        </p>
                        <ul class="results">
                            <li v-for="instance in resInstances" :key="instance.id">
                                {{ instance.name }}
                            </li>
                        </ul>
                    </div>
                    <div v-if="resDevices.length > 0" class="section devices">
                        <p class="title">
                            <ChipIcon class="icon ff-icon-sm" />
                            <span class="text">Devices</span>
                            <span class="counter">({{ resDevices.length }})</span>
                        </p>
                        <ul class="results">
                            <li v-for="device in resDevices" :key="device.id">
                                {{ device.name }}
                            </li>
                        </ul>
                    </div>
                </div>
            </transition>
        </div>
    </div>
</template>

<script>
import { ChipIcon, SearchIcon, TemplateIcon, XIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import globalApi from '../../api/global.js'
import SpinnerIcon from '../../components/icons/Spinner.js'
import { debounce } from '../../utils/eventHandling.js'
import ProjectsIcon from '../icons/Projects.js'

export default {
    name: 'GlobalSearch',
    components: {
        SearchIcon,
        SpinnerIcon,
        XIcon,
        ProjectsIcon,
        TemplateIcon,
        ChipIcon
    },
    data () {
        return {
            query: '',
            isFocused: false,
            results: [],
            loading: false
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
        query (newVal, oldVal) {
            if (newVal) {
                this.loading = true
                this.getData()
            }

            if ((!!oldVal && oldVal.length > 0) && !(newVal && newVal.length === 0)) {
                // clears results when user deletes query
                this.results = []
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
        getData: debounce(async function () {
            return globalApi.search(this.team.id, this.query)
                .then(res => {
                    this.results = res.results
                })
                .finally(() => {
                    this.loading = false
                })
        }, 500)
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

        .ff-icon-sm.close,
        .ff-icon-sm.search {
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
            min-width: 100%;
            z-index: 120;
            padding: 0 5px;

            .section {
                margin-bottom: 15px;

                .title {
                    position: relative;
                    margin-bottom: 5px;
                    display: flex;
                    align-items: self-end;
                    gap: 5px;

                    .counter {
                        opacity: .6;
                        font-size: 90%;
                    }

                    &:after {
                        height: 2px;
                        background: $ff-grey-200;
                        content: '';
                        flex: 1;
                        align-self: center;
                    }
                }

                &:last-of-type {
                    margin-bottom: 0;
                }
            }
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
