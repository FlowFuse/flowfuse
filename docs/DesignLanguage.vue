<template>
    <nav :class="{'ff-bg-light': theme === 'light', 'ff-bg-dark': theme === 'dark'}">
        <h2 class="">Components</h2>
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
                        <ff-button kind="secondary">
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
                <!-- Data Table -->
                <h1>Data Table</h1>
                <h2 ref="ff-data-table"><pre>ff-data-table</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['data-table'].components[0].props"></props-table>
                <h3>Slots:</h3>
                <slots-table :rows="groups['data-table'].components[0].slots"></slots-table>
                <h3>Emits:</h3>
                <events-table :rows="groups['data-table'].components[0].emits"></events-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <h5>Example 1: Selectable Rows &amp; Load More</h5>
                        <ff-data-table :columns="data.table0.columns" :rows="data.table0.rows" :rows-selectable="true" :show-load-more="true"></ff-data-table>
                        <code style="margin-top: 24px;">{{ groups['data-table'].components[0].examples[0].code }}</code>
                        <code style="margin-top: 24px;">cols = {{ pretty(data.table0.columns) }}</code>
                        <code style="margin-top: 24px;">rows = {{ pretty(data.table0.rows) }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 2: Sortable Columns</h5>
                        <ff-data-table :columns="data.table1.columns" :rows="data.table1.rows"></ff-data-table>
                        <code style="margin-top: 24px;">{{ groups['data-table'].components[0].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 3: Context Menu</h5>
                        <ff-data-table :columns="data.table0.columns" :rows="data.table0.rows">
                            <template v-slot:context-menu>
                                <ff-list-item label="Option 1" @click="doSomething"/>
                                <ff-list-item label="Option 2" @click="doSomething"/>
                                <ff-list-item label="Option 3" @click="doSomething"/>
                            </template>
                        </ff-data-table>
                        <code style="margin-top: 24px;">{{ groups['data-table'].components[0].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 4: Filtering via Search &amp; Actions</h5>
                        <ff-data-table :columns="data.table3.columns" :rows="table3Filtered"
                            :show-search="true" search-placeholder="Search here..." v-model:search="data.table3.search">
                            <template v-slot:actions>
                                <ff-button>Press Me!</ff-button>
                                <ff-button>Click Me!</ff-button>
                            </template>
                        </ff-data-table>
                        <code style="margin-top: 24px;">{{ groups['data-table'].components[0].examples[3].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 5: Custom Row Content</h5>
                        <ff-data-table :columns="data.table2.columns">
                            <template v-slot:rows>
                                <ff-data-table-row>
                                    <ff-data-table-cell>
                                        Testing
                                    </ff-data-table-cell>
                                    <ff-data-table-cell>
                                        We can put anything in here...
                                    </ff-data-table-cell>
                                    <ff-data-table-cell>
                                        <ff-notification-pill :count="4"></ff-notification-pill>
                                    </ff-data-table-cell>
                                </ff-data-table-row>
                            </template>
                        </ff-data-table>
                        <code style="margin-top: 24px;">{{ groups['data-table'].components[0].examples[4].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 6: v-for Selectable Rows &amp; Custom Headers</h5>
                        <ff-data-table>
                            <template v-slot:header>
                                <ff-data-table-row>
                                    <ff-data-table-cell>
                                        Custom Header
                                    </ff-data-table-cell>
                                    <ff-data-table-cell>
                                        We can put anything in here too
                                    </ff-data-table-cell>
                                    <ff-data-table-cell>
                                        <ff-notification-pill :count="74"></ff-notification-pill>
                                    </ff-data-table-cell>
                                </ff-data-table-row>
                            </template>
                            <template v-slot:rows>
                                <ff-data-table-row selectable v-for="row in data.table3.rows" :key="row">
                                    <ff-data-table-cell>
                                        {{ row.fName }}
                                    </ff-data-table-cell>
                                    <ff-data-table-cell>
                                        {{ row.sName }}
                                    </ff-data-table-cell>
                                    <ff-data-table-cell>
                                        <ff-notification-pill :count="row.number"></ff-notification-pill>
                                    </ff-data-table-cell>
                                </ff-data-table-row>
                            </template>
                        </ff-data-table>
                        <code style="margin-top: 24px;">{{ groups['data-table'].components[0].examples[5].code }}</code>
                        <code style="margin-top: 24px;">rows = {{ pretty(data.table3.rows) }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 7: No Data</h5>
                        <ff-data-table :columns="data.table1.columns" :rows="[]"></ff-data-table>
                        <code style="margin-top: 24px;">{{ groups['data-table'].components[0].examples[6].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 8: Loading</h5>
                        <ff-data-table :columns="data.table1.columns" :rows="data.table1.rows" :loading="true" loading-message="Loading Projects..."></ff-data-table>
                        <code style="margin-top: 24px;">{{ groups['data-table'].components[0].examples[7].code }}</code>
                    </div>
                </div>
                <h2 ref="ff-data-table-row"><pre>ff-data-table-row</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['data-table'].components[1].props"></props-table>
                <h3>Slots:</h3>
                <slots-table :rows="groups['data-table'].components[1].slots"></slots-table>
                <h2 ref="ff-data-table-cell"><pre>ff-data-table-cell</pre></h2>
                <h3>Slots:</h3>
                <slots-table :rows="groups['data-table'].components[2].slots"></slots-table>
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
                <h3>Slots:</h3>
                <slots-table :rows="groups['input'].components[0].slots"></slots-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <h5>Simple Text Input</h5>
                        <ff-text-input placeholder="Insert something here..." v-model="models.textInput0"/>
                        {{ models.textInput0 }}
                        <code>{{ groups['input'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Error State</h5>
                        <ff-text-input placeholder="Insert something here..." v-model="models.textInput0" :error="'This is the error'"/>
                        <code>{{ groups['input'].components[0].examples[3].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Type: Password</h5>
                        <ff-text-input type="password" placeholder="Password goes here..."/>
                        <code>{{ groups['input'].components[0].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Type: E-Mail</h5>
                        <ff-text-input type="email"/>
                        <code>{{ groups['input'].components[0].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Text Input with Icon (e.g. Search)</h5>
                        <ff-text-input type="email">
                            <template v-slot:icon>
                                <SearchIcon />
                            </template>
                        </ff-text-input>
                        <code>{{ groups['input'].components[0].examples[3].code }}</code>
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
                <h2 ref="ff-radio-group"><pre>ff-radio</pre></h2>
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
                <!-- Tile Selection -->
                <h2 ref="ff-tile-selection"><pre>ff-tile-selection</pre></h2>
                <markdown-viewer class="description" :content="groups['input'].components[4].description"/>
                <h3>Properties:</h3>
                <props-table :rows="groups['input'].components[4].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-tile-selection v-model="models.tiles0">
                            <ff-tile-selection-option value="1" label="Option 1" :description="'Markdown supported in the description, consectetur adipiscing elit ut aliquam'" price="$15.00" price-interval="/month"/>
                            <ff-tile-selection-option value="2" label="Option 2" :description="'\n * So we can offer bullet point lists\n* That help summarise the selection option'" price="$50.00" price-interval="/month"/>
                        </ff-tile-selection>
                        {{ models.tiles0 }}
                        <code>{{ groups['input'].components[4].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-tile-selection v-model="models.tiles1">
                            <ff-tile-selection-option value="1" label="Option 1" :description="'Markdown supported in the description, consectetur adipiscing elit ut aliquam'"/>
                            <ff-tile-selection-option value="2" label="Option 2" :description="'\n * So we can offer bullet point lists\n* That help summarise the selection option'"/>
                        </ff-tile-selection>
                        {{ models.tiles1 }}
                        <code>{{ groups['input'].components[4].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <ff-tile-selection>
                            <ff-tile-selection-option :editable="true" value="1" label="Option 1" :description="'Markdown supported in the description, consectetur adipiscing elit ut aliquam'" price="$15.00" price-interval="/month" :meta="[{key: 'a', value: 1}, {key: 'b', value: 2}]"/>
                            <ff-tile-selection-option :editable="true" value="2" label="Option 2" :description="'\n * So we can offer bullet point lists\n* That help summarise the selection option'" price="$50.00" price-interval="/month" :meta="[{key: 'c', value: 3}, {key: 'd', value: 4}]"/>
                        </ff-tile-selection>
                        <code>{{ groups['input'].components[4].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <ff-tile-selection v-model="models.tiles3">
                            <ff-tile-selection-option value="1" label="Option 1" :description="'Markdown supported in the description, consectetur adipiscing elit ut aliquam'" price="$15.00" price-interval="/month"/>
                            <ff-tile-selection-option :disabled="true" value="2" label="Option 2" :description="'The second option is disabled.'" price="$50.00" price-interval="/month"/>
                            <ff-tile-selection-option value="3" label="Option 3" :description="'The third option.'" price="$50.00" price-interval="/month"/>
                        </ff-tile-selection>
                        {{ models.titles3 }}
                        <code>{{ groups['input'].components[4].examples[3].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Notifications -->
                <h1>Notifications</h1>
                <markdown-viewer class="description" :content="groups['notifications'].description"/>
                <h2 ref="ff-notification-pill"><pre>ff-notification-pill</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['notifications'].components[0].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-notification-pill :count="4" />
                        <code>{{ groups['notifications'].components[0].examples[0].code }}</code>
                    </div>
                </div>
                <h2 ref="ff-notification-toast"><pre>ff-notification-toast</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['notifications'].components[1].props"></props-table>
                <h3>Slots:</h3>
                <slots-table :rows="groups['notifications'].components[1].slots"></slots-table>
                <h3>Emits:</h3>
                <events-table :rows="groups['notifications'].components[1].emits"></events-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-notification-toast type="info" message="Hello World"></ff-notification-toast>
                        <code>{{ groups['notifications'].components[1].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-notification-toast type="warning" message="Lorem ipsum dolor sit amet, consectetur adipiscing elit ut aliquam, purus sit amet luctus venenatis, lectus magna fringilla urna"></ff-notification-toast>
                        <code>{{ groups['notifications'].components[1].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <ff-notification-toast type="confirmation" message="Hello World"></ff-notification-toast>
                        <code>{{ groups['notifications'].components[1].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <ff-notification-toast type="confirmation" message="Hello World" :countdown="3000"></ff-notification-toast>
                        <code>{{ groups['notifications'].components[1].examples[3].code }}</code>
                    </div>
                    <div class="example">
                        <ff-notification-toast type="info" :show-close="false">
                            <template v-slot:message>
                                We can also define content using a slot instead, and use the actions slot to add our own buttons
                            </template>
                            <template v-slot:actions>
                                <ff-button @click="doSomething()">Example</ff-button>
                            </template>
                        </ff-notification-toast>
                        <code>{{ groups['notifications'].components[1].examples[4].code }}</code>
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
                        <h5>Example 1: Horizontal Tabs</h5>
                        <ff-tabs orientation="horizontal">
                            <ff-tab label="Option 1" to="" />
                            <ff-tab label="Option 2" to="" />
                            <ff-tab label="Option 3" to="" />
                        </ff-tabs>
                        <code>{{ groups['tabs'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 2: Vertical Tabs</h5>
                        <ff-tabs orientation="vertical">
                            <ff-tab label="Option 1" to="" />
                            <ff-tab label="Option 2" to="" />
                            <ff-tab label="Option 3" to="" />
                        </ff-tabs>
                        <code>{{ groups['tabs'].components[0].examples[1].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Other -->
                <h1>Utilities</h1>
                <markdown-viewer class="description" :content="groups['utilities'].description"/>
                <h2 ref="ff-check"><pre>ff-check</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['utilities'].components[0].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-check :value="true"></ff-check>
                        <code>{{ groups['utilities'].components[0].examples[0].code }}</code>
                    </div>
                </div>
                <h2 ref="ff-list-item"><pre>ff-list-item</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="groups['utilities'].components[1].props"></props-table>
            </div>
        </div>
    </main>
</template>

<script>

import _ from 'underscore'

import PropsTable from './components/PropsTable.vue'
import EventsTable from './components/EventsTable.vue'
import SlotsTable from './components/SlotsTable.vue'

import MarkdownViewer from '@/components/Markdown.vue'

import buttonDocs from './data/button.docs.json'
import tableDocs from './data/table.docs.json'
import dialogDocs from './data/dialog.docs.json'
import inputDocs from './data/input.docs.json'
import notificationsDocs from './data/notifications.docs.json'
import tabsDocs from './data/tabs.docs.json'
import utilitiesDocs from './data/utilities.docs.json'

// icons
import { PlusSmIcon, SearchIcon } from '@heroicons/vue/outline'

export default {
    name: 'DesignLanguage',
    components: {
        PropsTable,
        EventsTable,
        SlotsTable,
        MarkdownViewer,
        // icons
        PlusSmIcon,
        SearchIcon
    },
    setup () {
        return {
            iconPlus: PlusSmIcon
        }
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
                radio1: null,
                tiles0: null,
                tiles1: null,
                tiles3: null
            },
            groups: {
                button: buttonDocs,
                'data-table': tableDocs,
                dialog: dialogDocs,
                input: inputDocs,
                notifications: notificationsDocs,
                tabs: tabsDocs,
                utilities: utilitiesDocs
            },
            data: {
                table0: {
                    columns: [{
                        key: 'colA',
                        label: 'Column A',
                        sortable: false
                    }, {
                        key: 'colB',
                        label: 'Column B',
                        sortable: false
                    }, {
                        key: 'colC',
                        label: 'Column C',
                        sortable: false
                    }],
                    rows: [{
                        colA: 'This is Row 1, Column A',
                        colB: 2,
                        colC: true
                    }, {
                        colA: 'This is Row 2, Column A',
                        colB: 17,
                        colC: false
                    }]
                },
                table1: {
                    columns: [{
                        key: 'colA',
                        label: 'Column A',
                        sortable: true
                    }, {
                        key: 'colB',
                        label: 'Column B',
                        sortable: true
                    }, {
                        key: 'colC',
                        label: 'Column C',
                        sortable: true
                    }, {
                        key: 'colD',
                        label: 'Column D',
                        sortable: true
                    }],
                    rows: [{
                        colA: 'This is Row 1, Column A',
                        colB: 2,
                        colC: 34,
                        colD: true
                    }, {
                        colA: 'This is Row 2, Column A',
                        colB: 17,
                        colC: 12.3,
                        colD: false
                    }]
                },
                table2: {
                    search: '',
                    columns: [{
                        key: 'fName',
                        label: 'First Name',
                        sortable: false
                    }, {
                        key: 'sName',
                        label: 'Last Name',
                        sortable: false
                    }, {
                        key: 'number',
                        label: 'Number',
                        sortable: false
                    }],
                    rows: [{
                        fName: 'Alice',
                        sName: 'Skywalker',
                        number: 123
                    }, {
                        fName: 'Bob',
                        sName: 'Palpatine',
                        number: 456
                    }, {
                        fName: 'Freddie',
                        sName: 'Solo',
                        number: 789
                    }]
                },
                table3: {
                    search: '',
                    columns: [{
                        key: 'fName',
                        label: 'First Name',
                        sortable: false
                    }, {
                        key: 'sName',
                        label: 'Last Name',
                        sortable: false
                    }, {
                        key: 'number',
                        label: 'Number',
                        sortable: false
                    }],
                    rows: [{
                        fName: 'Alice',
                        sName: 'Skywalker',
                        number: 123
                    }, {
                        fName: 'Bob',
                        sName: 'Palpatine',
                        number: 456
                    }, {
                        fName: 'Freddie',
                        sName: 'Solo',
                        number: 789
                    }]
                }
            }
        }
    },
    computed: {
        groups_ordered: function () {
            return _.sortedBy(this.groups, 'name')
        },
        table3Filtered: function () {
            const search = this.data.table3.search
            if (search) {
                return this.data.table3.rows.filter(function (cell, index) {
                    const vals = Object.values(cell)
                    for (let i = 0; i < vals.length; i++) {
                        let value = vals[i]
                        if (typeof value === 'number') {
                            value = value.toString()
                        }
                        if (typeof value === 'string') {
                            if (value.toLowerCase().indexOf(search.toLowerCase()) > -1) {
                                return true
                            }
                        }
                    }
                    return false
                })
            } else {
                return this.data.table3.rows
            }
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
        },
        pretty: function (value) {
            return JSON.stringify(value, null, 2)
        }
    }
}
</script>

<style lang="scss">
@import "./index.scss";
</style>
