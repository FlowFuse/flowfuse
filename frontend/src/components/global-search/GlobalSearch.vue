<template>
    <div id="global-search" :class="{focused: isFocused}">
        <transition name="fade" mode="out-in">
            <div v-if="isFocused" class="overlay" @click="deFocusSearch" />
        </transition>
        <div class="content-wrapper">
            <div class="search-wrapper">
                <ff-button class="close-button" size="small" kind="secondary">
                    <XIcon class="ff-icon-sm" @click="deFocusSearch" />
                </ff-button>

                <div class="input-wrapper">
                    <!--                    <SearchIconSolid class="ff-icon-sm mobile-search" @click="focusSearch" />-->

                    <transition name="primary-fade" mode="out-in">
                        <SpinnerIcon v-if="loading" class="ff-icon-sm search" />
                        <SearchIcon v-else class="ff-icon-sm search" />
                    </transition>

                    <SearchTrigger @interacted="focusSearch" />

                    <input
                        ref="input"
                        v-model="query"
                        class="overlay-input iterable"
                        :class="{'has-results': hasResults}"
                        type="text"
                        placeholder="Search your team (CTRL + K)"
                    >
                    <transition name="fade" mode="out-in">
                        <XIcon v-if="query.length && isFocused" class="ff-icon-sm close cursor-pointer" @click="resetSearch" />
                    </transition>
                </div>
            </div>

            <div v-if="isFocused && hasResults" class="results-wrapper">
                <result-section
                    v-if="resApplication.length > 0"
                    title="Applications"
                    :icon="TemplateIcon"
                    :results="resApplication"
                    :query="query"
                    result-type="application"
                    @result-selected="handleSelectedResult"
                >
                    <template #result-icon>
                        <TemplateIcon class="ff-icon-sm" />
                    </template>
                    <template #result-actions="{item}">
                        <span class="result-badge">
                            <ProjectsIcon class="ff-icon-sm" />
                            <span class="truncate">{{ item.instanceCount }}</span>
                        </span>
                        <span class="result-badge">
                            <ChipIcon class="ff-icon-sm" />
                            <span class="truncate">{{ item.deviceCount }}</span>
                        </span>
                        <span class="result-badge">
                            <img src="../../components/icons/device-group-outline.svg" alt="device-groups-icon" class="ff-icon-sm">
                            <span class="truncate">{{ item.deviceGroupCount }}</span>
                        </span>
                        <span class="result-badge">
                            <ClockIcon class="ff-icon-sm" />
                            <span class="truncate">{{ item.snapshotCount }}</span>
                        </span>
                        <span class="result-badge">
                            <PipelinesIcon class="ff-icon-sm" />
                            <span class="truncate">{{ item.pipelineCount }}</span>
                        </span>
                    </template>
                </result-section>

                <result-section
                    v-if="resInstances.length > 0"
                    title="Instances" :icon="ProjectsIcon"
                    :results="resInstances"
                    :query="query"
                    result-type="instance"
                    @result-selected="handleSelectedResult"
                >
                    <template #result-icon>
                        <ProjectsIcon class="ff-icon-sm" />
                    </template>
                    <template #result-details="{item}">
                        {{ item.url }}
                    </template>
                </result-section>

                <result-section
                    v-if="resDevices.length > 0"
                    title="Devices" :icon="ChipIcon"
                    :results="resDevices"
                    :query="query"
                    result-type="device"
                    @result-selected="handleSelectedResult"
                >
                    <template #result-icon="{item}">
                        <InstanceStatusBadge :text="item.status" />
                    </template>
                </result-section>
            </div>
        </div>
    </div>
</template>

<script>
import { ChipIcon, ClockIcon, SearchIcon, TemplateIcon, XIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import globalApi from '../../api/global.js'
import SpinnerIcon from '../../components/icons/Spinner.js'
import InstanceStatusBadge from '../../pages/instance/components/InstanceStatusBadge.vue'
import { debounce } from '../../utils/eventHandling.js'
import PipelinesIcon from '../icons/Pipelines.js'
import ProjectsIcon from '../icons/Projects.js'

import ResultSection from './components/ResultSection.vue'
import SearchTrigger from './components/SearchTrigger.vue'

export default {
    name: 'GlobalSearch',
    components: {
        SearchTrigger,
        InstanceStatusBadge,
        ResultSection,
        SearchIcon,
        SpinnerIcon,
        XIcon,
        TemplateIcon,
        ProjectsIcon,
        ChipIcon,
        ClockIcon,
        PipelinesIcon
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
        },
        ProjectsIcon,
        TemplateIcon,
        ChipIcon
    },
    watch: {
        query (newVal, oldVal) {
            if (newVal) {
                this.loading = true
                this.getData()
            }

            if ((!!oldVal && oldVal.length > 0) && !(newVal && newVal.length === 0)) {
                // clears results when user deletes query
                this.clearResults()
            }
        },
        team () {
            this.resetSearch()
            this.clearResults()
        },
        results: {
            handler: function () {
                document.removeEventListener('keydown', this.bindKeyNavigation)
                this.$nextTick(() => {
                    document.addEventListener('keydown', this.bindKeyNavigation)
                })
            },
            immediate: true
        },
        isFocused (isFocused) {
            // refresh data when re-opening the search modal
            if (isFocused === true && this.query.length > 0) {
                this.getData()
            }
        }
    },
    mounted () {
        document.addEventListener('keydown', this.bindSearchShortcut)
    },
    unmounted () {
        document.removeEventListener('keydown', this.bindSearchShortcut)
        document.removeEventListener('keydown', this.bindKeyNavigation)
    },

    methods: {
        markRaw,
        resetSearch () {
            this.query = ''
        },
        clearResults () {
            this.results = []
        },
        onEscKeyPress () {
            this.deFocusSearch()
            this.resetSearch()
        },
        focusSearch () {
            document.addEventListener('keydown', this.handleEscapeKey)
            this.isFocused = true
            this.$nextTick(() => {
                this.$refs.input.focus()
                this.$refs.input.select()
            })
        },
        deFocusSearch () {
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
        }, 500),
        handleSelectedResult () {
            this.deFocusSearch()
        },
        bindSearchShortcut (event) {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault()
                if (!this.isFocused) {
                    this.focusSearch()
                } else this.deFocusSearch()
                this.$refs.input.focus()
                this.$refs.input.select()
            }
        },
        bindKeyNavigation (event) {
            const anchors = document.querySelectorAll('#global-search .iterable')
            const anchorsArray = Array.from(anchors)
            const currentIndex = anchorsArray.findIndex(anchor => anchor === document.activeElement)

            if (event.key === 'ArrowDown') {
                event.preventDefault()
                const nextIndex = (currentIndex + 1) % anchorsArray.length
                anchorsArray[nextIndex].focus()
            } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                const prevIndex = (currentIndex - 1 + anchorsArray.length) % anchorsArray.length
                anchorsArray[prevIndex].focus()
            }
        }
    }
}
</script>

<style scoped lang="scss">
#global-search {
    padding: 0 12px;
    display: flex;
    flex: 1;
    justify-content: flex-end;
    max-width: 100%;
    padding-left: 55px;

    .content-wrapper {
        position: relative;
        justify-content: flex-end;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;

        .search-wrapper {
            display: flex;
            gap: 5px;
            align-items: center;
            width: 100%;

            .mobile-search {
                display: none;
                cursor: pointer;
                color: $ff-white;
                min-width: 20px;
                min-height: 20px;
            }

            .close-button {
                display: none;
            }

            .input-wrapper {
                flex: 1;
                display: flex;
                flex-direction: column;
                position: relative;
                width: 100%;

                .ff-icon-sm.close,
                .ff-icon-sm.search {
                    color: $ff-grey-400;
                    position: absolute;
                    z-index: 1;
                    top: 8px;

                    &.search {
                        left: 7px;
                    }

                    &.close {
                        right: 7px;
                    }
                }

                input {
                    color: transparent;
                    padding: 5px 27px;
                    background: $ff-grey-50;
                    border-color: $ff-color--border;
                    width: 100%;

                    &.overlay-input {
                        display: none;
                    }
                }
            }
        }

        .results-wrapper {
            background: $ff-white;
            min-width: 100%;
            z-index: 120;
            padding: 5px 5px 15px 5px;

            .result-badge {
                padding: 0 5px;
                width: 50px;
                max-height: 25px;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 5px;
                border: 1px solid $ff-indigo-700;
                color: $ff-indigo-700;
                border-radius: 5px;
                background: $ff-white;
            }
        }
    }

    &.focused {
        .content-wrapper {
            position: fixed;
            width: 60vw;
            background: white;
            top: 15px;
            left: 20vw;
            z-index: 120;
            border: none;
            border-radius: 5px;

            .search-wrapper {
                .input-wrapper {
                    .ff-icon-sm.search,
                    .ff-icon-sm.close {
                        color: $ff-grey-500;
                    }

                    input {
                        color: $ff-grey-500;
                        flex: 1;
                        background: white;
                        display: none;
                        width: 100%;

                        &.overlay-input {
                            display: block;
                            transition: ease-in-out .3s;

                            &.has-results {
                                border-bottom-left-radius: 0;
                                border-bottom-right-radius: 0;
                            }
                        }
                    }
                }
            }

            .results-wrapper {
                overflow: auto;
                max-height: 90vh;

                .ff-icon-sm {
                    min-width: 16px;
                }
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

@media screen and (max-width: 1023px) {
    #global-search {

        input.qwe {
            background: red !important;
        }
        &.focused {
            .content-wrapper {
                width: 100%;
                top: 0;
                left: 0;
                border-top-left-radius: 0;
                border-top-right-radius: 0;

                .search-wrapper {
                    margin: 5px;
                    padding-right: 10px;
                    .close-button {
                        display: block;
                    }

                }
            }
        }
    }
}
@media screen and (max-width: 639px) {
    #global-search {
        .content-wrapper {
            padding: 5px 0;

            .search-wrapper {
                .mobile-search {
                    display: block;
                }

                .close,
                .search,
                input {
                    display: none;
                }

                input {
                    &.has-results {
                        border-bottom-left-radius: 5px !important;
                        border-bottom-right-radius: 5px !important;
                    }
                }

            }
        }

        &.focused {
            .content-wrapper {
                padding: 10px;
                .mobile-search {
                    display: none;
                }

                .search-wrapper {
                    .close,
                    .search,
                    input {
                        display: block;
                    }
                }
            }
        }
    }
}
</style>

<style lang="scss">
#global-search {
    .content-wrapper {
        .section {
            .results {
                .result {
                    .actions {
                        .instance-editor-link {
                            & > a {
                                padding: 0 5px;

                                .ff-btn--icon,
                                svg {
                                    height: 16px;
                                    width: 16px;
                                }
                            }
                        }
                    }
                    .icon {
                        .forge-badge {
                            background: $ff-white;
                        }
                    }
                }
            }
        }
    }
}
</style>
