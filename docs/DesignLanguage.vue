<template>
    <nav>
        <h1 class="">Components</h1>
        <ul id="grouplist">
            <li v-for="g in groups" :key="g.name">
                <h3>{{ g.name }}</h3>
                <ul v-for="c in g.components" :key="c.name">
                    <li @click="toSection(c.name)">{{ c.name }}</li>
                </ul>
            </li>
        </ul>
    </nav>
    <main :class="{'ff-bg-light': theme === 'light', 'ff-bg-dark': theme === 'dark'}">
        <!-- Theme Selection -->
        <div class="theme-selection">
            <label>Theme:</label>
            <select v-model="theme">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
        </div>
        <div class="container">
            <div class="section" id="section-buttons">
                <!-- Buttons -->
                <h1>Buttons</h1>
                <h2 ref="ff-button"><pre>ff-button</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['button'].components[0].props"></props-table>
                <h3>Slots:</h3>
                <slots-table :rows="groups['button'].components[0].slots"></slots-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-button>Hello World</ff-button>
                        <code>{{ groups['button'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="secondary">Hello World</ff-button>
                        <code>{{ groups['button'].components[0].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="tertiary">Hello World</ff-button>
                        <code>{{ groups['button'].components[0].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="danger">Hello World</ff-button>
                        <code>{{ groups['button'].components[0].examples[3].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button :disabled="true">Hello World</ff-button>
                        <code>{{ groups['button'].components[0].examples[4].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="primary">
                            <template v-slot:icon-left><PlusSmIcon /></template>
                            Hello World
                        </ff-button>
                        <code>{{ groups['button'].components[0].examples[5].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="primary">
                            <template v-slot:icon-right><PlusSmIcon /></template>
                            Hello World
                        </ff-button>
                        <code>{{ groups['button'].components[0].examples[6].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="primary" size="small">
                            <template v-slot:icon-left><PlusSmIcon /></template>
                            Hello World
                        </ff-button>
                        <code>{{ groups['button'].components[0].examples[7].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="primary">
                            <template v-slot:icon><PlusSmIcon /></template>
                        </ff-button>
                        <code>{{ groups['button'].components[0].examples[8].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Inputs -->
                <h1>Inputs</h1>
                <h2 ref="ff-text-input"><pre>ff-text-input</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['input'].components[0].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-text-input placeholder="Insert something here..." v-model="models.textInput0"/>
                        {{ models.textInput0 }}
                        <code>{{ groups['input'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-text-input :password="true" placeholder="Password goes here..."/>
                        <code>{{ groups['input'].components[0].examples[1].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Tabs -->
                <h1>Tabs</h1>
                <markdown-viewer class="description" :content="groups['tabs'].description"/>
                <h2 ref="ff-tabs"><pre>ff-tabs</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['tabs'].components[0].props"></props-table>
                <h3>Emits:</h3>
                <events-table :rows="groups['tabs'].components[0].emits"></events-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-tabs orientation="horizontal">
                            <ff-tab label="Option 1" to="" />
                            <ff-tab label="Option 2" to="" />
                            <ff-tab label="Option 3" to="" />
                        </ff-tabs>
                        <code>{{ groups['tabs'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-tabs orientation="vertical">
                            <ff-tab label="Option 1" to="" />
                            <ff-tab label="Option 2" to="" />
                            <ff-tab label="Option 3" to="" />
                        </ff-tabs>
                        <code>{{ groups['tabs'].components[0].examples[1].code }}</code>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script>

import _ from 'underscore'

import PropsTable from './components/PropsTable.vue'
import EventsTable from './components/EventsTable.vue'
import SlotsTable from './components/SlotsTable.vue'

import buttonDocs from './data/button.docs.json'
import inputDocs from './data/input.docs.json'
import tabsDocs from './data/tabs.docs.json'

import MarkdownViewer from './components/Markdown.vue'

// icons
import { PlusSmIcon } from '@heroicons/vue/outline'

export default {
    name: 'DesignLanguage',
    components: {
        MarkdownViewer,
        PropsTable,
        EventsTable,
        SlotsTable,
        // icons
        PlusSmIcon
    },
    data () {
        return {
            theme: 'light',
            models: {
                textInput0: ''
            },
            groups: {
                button: buttonDocs,
                input: inputDocs,
                tabs: tabsDocs
            }
        }
    },
    computed: {
        groups_ordered: function () {
            return _.sortedBy(this.groups, 'name')
        }
    },
    async mounted () {
        await this.$nextTick()
        console.log(window.location.hash)
        this.toSection(window.location.hash.replace('#', ''))
    },
    methods: {
        toSection (ref) {
            if (ref) {
                const element = this.$refs[ref]
                element.scrollIntoView({ behavior: 'smooth' })
                window.location.hash = ref
            }
        }
    }
}
</script>

<style lang="scss">
@import "./index.scss";
</style>
