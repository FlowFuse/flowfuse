<template>
    <nav>
        <h1 class="">Components</h1>
        <ul id="grouplist">
            <li v-for="g in groups" :key="g.name">
                <h3>{{ g.name }}</h3>
                <ul>
                    <li v-for="c in g.components" :key="c.name" @click="toSection(c.name)">{{ c.name }}</li>
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
                <!-- FF Button -->
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
                <!-- FF Kebab Menu -->
                <h2 ref="ff-kebab-menu"><pre>ff-kebab-menu</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['button'].components[1].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-kebab-menu menu-align="left">
                            <ff-list-item label="Option 1" />
                            <ff-list-item label="Option 2" />
                        </ff-kebab-menu>
                        <code>{{ groups['button'].components[1].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-kebab-menu style="margin-left: 150px;" menu-align="right">
                            <ff-list-item label="Option 1" />
                            <ff-list-item label="Option 2" />
                        </ff-kebab-menu>
                        <code>{{ groups['button'].components[1].examples[1].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Dialog Box -->
                <h1>Dialog Box</h1>
                <h2 ref="ff-dialog"><pre>ff-dialog</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['dialog'].components[0].props"></props-table>
                <h3>Emits:</h3>
                <events-table :rows="groups['dialog'].components[0].emits"></events-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-button @click="models.showDialog = !models.showDialog">Show Dialog</ff-button>
                        <ff-dialog :open="models.showDialog" header="My Dialog Box"
                            @cancel="models.showDialog = false"
                            @confirm="models.showDialog = false">
                            <p style="margin-bottom: 12px">The main message for the dialog box goes here. We can put any elements we like here.
                            For example, a text input:</p>
                            <ff-text-input placeholder="My Text Input"/>
                        </ff-dialog>
                        <code>{{ groups['dialog'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button @click="models.showDialog1 = !models.showDialog1">Show Delete Dialog</ff-button>
                        <ff-dialog :open="models.showDialog1" header="My Other Dialog Box"
                            @cancel="models.showDialog1 = false"
                            @confirm="models.showDialog1 = false">
                            <template v-slot:default>
                                Are you sure you want to delete this?
                            </template>
                            <template v-slot:actions>
                                <ff-button kind="secondary" @click="models.showDialog1 = false">Cancel</ff-button>
                                <ff-button kind="danger" @click="models.showDialog1 = false">Delete</ff-button>
                            </template>
                        </ff-dialog>
                        <code>{{ groups['dialog'].components[0].examples[1].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Form Elements -->
                <h1>Form Elements</h1>
                <!-- Text Input -->
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
                <!-- Dropdown -->
                <h2 ref="ff-dropdown"><pre>ff-dropdown</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['input'].components[1].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-dropdown v-model="models.dropdown0">
                            <ff-dropdown-option label="Option 1" value="1"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 2" value="2"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 3" value="3"></ff-dropdown-option>
                        </ff-dropdown>
                        {{ models.dropdown0 }}
                        <code>{{ groups['input'].components[1].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-dropdown v-model="models.dropdown1" placeholder="Dropdown Button" dropdown-style="button">
                            <ff-dropdown-option label="Option 1" value="1"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 2" value="2"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 3" value="3"></ff-dropdown-option>
                        </ff-dropdown>
                        {{ models.dropdown1 }}
                        <code>{{ groups['input'].components[1].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <ff-dropdown v-model="models.dropdown1" placeholder="Dropdown Button Right" dropdown-style="button" options-align="right">
                            <ff-dropdown-option label="Option 1" value="1"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 2" value="2"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 3" value="3"></ff-dropdown-option>
                        </ff-dropdown>
                        {{ models.dropdown2 }}
                        <code>{{ groups['input'].components[1].examples[2].code }}</code>
                    </div>
                </div>
                <!-- Checkbox -->
                <h2 ref="ff-checkbox"><pre>ff-checkbox</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['input'].components[2].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-checkbox label="My Checkbox" v-model="models.checkbox0"></ff-checkbox>
                        {{ models.checkbox0 }}
                        <code>{{ groups['input'].components[2].examples[0].code }}</code>
                    </div>
                </div>
                <!-- Radio -->
                <h2 ref="ff-radio"><pre>ff-radio</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['input'].components[3].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-radio-group v-model="models.radio0" :options="[{label: 'Option 1', value: 1, checked: true}, {label: 'Option 2', value: 2}]"></ff-radio-group>
                        {{ models.radio0 }}
                        <code>{{ groups['input'].components[3].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-radio-group v-model="models.radio1" label="We can also provide a label here" :options="[{label: 'Option 1', value: 1, checked: true}, {label: 'Option 2', value: 2}]" orientation="vertical"></ff-radio-group>
                        {{ models.radio1 }}
                        <code>{{ groups['input'].components[3].examples[1].code }}</code>
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
import dialogDocs from './data/dialog.docs.json'
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
                showDialog: false,
                showDialog1: false,
                textInput0: '',
                dropdown0: null,
                dropdown1: null,
                checkbox0: false,
                radio0: null,
                radio1: null
            },
            groups: {
                button: buttonDocs,
                dialog: dialogDocs,
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
