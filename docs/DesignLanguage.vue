<template>
    <!-- Used to show interactivity -->
    <div style="position: absolute;right: 12px;top: 12px;z-index: 10;min-width: 350px;">
        <ff-notification-toast v-for="(a, $index) in alerts.slice().reverse()" :key="a.timestamp"
                               :type="a.type" :message="a.message"
                               :countdown="a.countdown || 3000" @close="clearAlert($index)" />
    </div>
    <nav :class="{'ff-bg-light': theme === 'light', 'ff-bg-dark': theme === 'dark'}">
        <h2 class="">Components</h2>
        <ul id="grouplist">
            <li v-for="g in cGroups" :key="g.name">
                <h3>{{ g.name }}</h3>
                <ul>
                    <li v-for="c in g.components" :key="c.name" @click="toSection(c.name)">{{ c.name }}</li>
                </ul>
            </li>
        </ul>
        <h2 class="">Directives</h2>
        <ul id="grouplist">
            <li v-for="g in dGroups" :key="g.name">
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
                <props-table :rows="cGroups['button'].components[0].props"></props-table>
                <h3>Slots:</h3>
                <slots-table :rows="cGroups['button'].components[0].slots"></slots-table>
                <h3>Methods:</h3>
                <methods-table :rows="cGroups['button'].components[0].methods" @callMethod="this.$refs['button-input']?.[$event]()"></methods-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-button ref="button-input" @click="doSomething('Button clicked')">Hello World</ff-button>
                        <code>{{ cGroups['button'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="secondary">Hello World</ff-button>
                        <code>{{ cGroups['button'].components[0].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="tertiary">Hello World</ff-button>
                        <code>{{ cGroups['button'].components[0].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="danger">Hello World</ff-button>
                        <code>{{ cGroups['button'].components[0].examples[3].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button :disabled="true">Hello World</ff-button>
                        <code>{{ cGroups['button'].components[0].examples[4].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="primary">
                            <template v-slot:icon-left><PlusSmIcon /></template>
                            Hello World
                        </ff-button>
                        <code>{{ cGroups['button'].components[0].examples[5].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="secondary">
                            <template v-slot:icon-right><PlusSmIcon /></template>
                            Hello World
                        </ff-button>
                        <code>{{ cGroups['button'].components[0].examples[6].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="primary" size="small">
                            <template v-slot:icon-left><PlusSmIcon /></template>
                            Hello World
                        </ff-button>
                        <code>{{ cGroups['button'].components[0].examples[7].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button kind="primary">
                            <template v-slot:icon><PlusSmIcon /></template>
                        </ff-button>
                        <code>{{ cGroups['button'].components[0].examples[8].code }}</code>
                    </div>
                </div>
                <!-- FF Kebab Menu -->
                <h2 ref="ff-kebab-menu"><pre>ff-kebab-menu</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['button'].components[1].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <h5>Left-Aligned Options</h5>
                        <ff-kebab-menu menu-align="left">
                            <ff-list-item label="Option 1" />
                            <ff-list-item label="Option 2" />
                        </ff-kebab-menu>
                        <code>{{ cGroups['button'].components[1].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Right-Aligned Options</h5>
                        <ff-kebab-menu style="margin-left: 150px;" menu-align="right">
                            <ff-list-item label="Option 1" />
                            <ff-list-item label="Option 2" />
                        </ff-kebab-menu>
                        <code>{{ cGroups['button'].components[1].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Disabled Option</h5>
                        <ff-kebab-menu menu-align="left">
                            <ff-list-item label="Option 1" />
                            <ff-list-item label="Option 2" disabled="true" />
                        </ff-kebab-menu>
                        <code>{{ cGroups['button'].components[1].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Danger Styling</h5>
                        <ff-kebab-menu menu-align="left">
                            <ff-list-item label="Option 1" />
                            <ff-list-item label="Option 2" kind="danger" />
                        </ff-kebab-menu>
                        <code>{{ cGroups['button'].components[1].examples[3].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Data Table -->
                <h1>Data Table</h1>
                <h2 ref="ff-data-table"><pre>ff-data-table</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['data-table'].components[0].props"></props-table>
                <h3>Slots:</h3>
                <slots-table :rows="cGroups['data-table'].components[0].slots"></slots-table>
                <h3>Emits:</h3>
                <events-table :rows="cGroups['data-table'].components[0].emits"></events-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <h5>Example 1: Selectable Rows &amp; Load More</h5>
                        <ff-data-table :columns="data.table0.columns" :rows="data.table0.rows" :rows-selectable="true" :show-load-more="true"></ff-data-table>
                        <code style="margin-top: 24px;">{{ cGroups['data-table'].components[0].examples[0].code }}</code>
                        <code style="margin-top: 24px;">cols = {{ pretty(data.table0.columns) }}</code>
                        <code style="margin-top: 24px;">rows = {{ pretty(data.table0.rows) }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 2: Sortable Columns</h5>
                        <ff-data-table :columns="data.table1.columns" :rows="data.table1.rows"></ff-data-table>
                        <code style="margin-top: 24px;">{{ cGroups['data-table'].components[0].examples[1].code }}</code>
                        <code style="margin-top: 24px;">rows = {{ pretty(data.table1.rows) }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 3: Context Menu</h5>
                        <p style="margin-bottom: 12px;">Note, the
                            <pre style="display:inline;">.stop</pre> event modifier on the event handlers. This is important if
                            <pre style="display:inline;">:rows-selectable="true"</pre> to prevent the click event bubbling up to the row.
                        </p>
                        <ff-data-table :columns="data.table0.columns" :rows="data.table0.rows">
                            <template v-slot:context-menu>
                                <ff-list-item label="Option 1" @click.stop=""/>
                                <ff-list-item label="Option 2" @click.stop=""/>
                                <ff-list-item label="Option 3" @click.stop=""/>
                            </template>
                        </ff-data-table>
                        <code style="margin-top: 24px;">{{ cGroups['data-table'].components[0].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 4: Filtering via Search &amp; Actions</h5>
                        <ff-data-table :columns="data.table3.columns" :rows="data.table3.rows"
                                       :show-search="true" search-placeholder="Search here..." v-model:search="data.table3.search">
                            <template v-slot:actions>
                                <ff-button>Press Me!</ff-button>
                                <ff-button>Click Me!</ff-button>
                            </template>
                        </ff-data-table>
                        <code style="margin-top: 24px;">{{ cGroups['data-table'].components[0].examples[3].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 5: Custom Row Content &amp; Components</h5>
                        <p style="margin-bottom: 12px;">
                            Note, this method requires components to be created that can parse and render the data structure provided to the row.
                        </p>
                        <p style="margin-bottom: 12px;">
                            The data passed to the sub-component can be manipulated using:
                            <ul style="margin: 12px 24px;list-style: disc;">
                                <li>
                                    <pre style="display:inline;">map</pre> - maps row properties to other names
                                </li>
                                <li><pre style="display:inline;">extraProps</pre> - passes additional properties into the component</li>
                            </ul>
                        </p>
                        <p style="margin-bottom: 6px;">
                            <b>Map</b><br />
                        </p>
                        <pre style="margin-bottom: 6px;">"map": {
    "count": "number",
    "name": "user.name",
},</pre>
                        <p style="margin-bottom: 12px;">
                            Maps the row properties <code style="display:inline;">number</code> and <code style="display:inline;">user.name</code>
                            to <code style="display:inline;">number</code> and <code style="display:inline;">name</code> respectively.
                        </p>
                        <p style="margin-bottom: 6px;">
                            <b>extraProps</b><br />
                        </p>
                        <pre  style="margin-bottom: 6px;">"extraProps": {
    "total": this.totalRows,
    "disabled": this.tableDisabled,
},</pre>
                        <p style="margin-bottom: 12px;">
                            Passes the properties <code style="display:inline;">totalRows</code> and <code style="display:inline;">tableDisabled</code> from wherever columns is defined into the component.
                        </p>
                        <p style="margin-bottom: 12px;">This method does still enable searching and sorting out of the box.</p>
                        <ff-data-table :columns="data.table4.columns" :rows="data.table4.rows"
                                       :show-search="true" :search-fields="['sName', 'number']" search-placeholder="search-fields limits which properties the search applies to."></ff-data-table>
                        <code style="margin-top: 24px;">{{ cGroups['data-table'].components[0].examples[8].code }}</code>
                        <code style="margin-top: 24px;">cols = {{ pretty(data.table4DocVersion.columns) }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 6: Custom Row Content &amp; Components</h5>
                        <p style="margin-bottom: 12px;">Note, this method will override the full row object inside data-table, including filtering/sorting and loading/no-data placeholder options of the table.</p>
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
                        <code style="margin-top: 24px;">{{ cGroups['data-table'].components[0].examples[4].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 7: v-for Selectable Rows &amp; Custom Headers</h5>
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
                        <code style="margin-top: 24px;">{{ cGroups['data-table'].components[0].examples[5].code }}</code>
                        <code style="margin-top: 24px;">rows = {{ pretty(data.table3.rows) }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 8: No Data</h5>
                        <ff-data-table :columns="data.table1.columns" :rows="[]"></ff-data-table>
                        <code style="margin-top: 24px;">{{ cGroups['data-table'].components[0].examples[6].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 9: Loading</h5>
                        <ff-data-table :columns="data.table1.columns" :rows="data.table1.rows" :loading="true" loading-message="Loading Projects..."></ff-data-table>
                        <code style="margin-top: 24px;">{{ cGroups['data-table'].components[0].examples[7].code }}</code>
                    </div>
                </div>
                <h2 ref="ff-data-table-row"><pre>ff-data-table-row</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['data-table'].components[1].props"></props-table>
                <h3>Slots:</h3>
                <slots-table :rows="cGroups['data-table'].components[1].slots"></slots-table>
                <h2 ref="ff-data-table-cell"><pre>ff-data-table-cell</pre></h2>
                <h3>Slots:</h3>
                <slots-table :rows="cGroups['data-table'].components[2].slots"></slots-table>
            </div>
            <div class="section">
                <!-- Dialog Box -->
                <h1>Dialog Box</h1>
                <h2 ref="ff-dialog"><pre>ff-dialog</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['dialog'].components[0].props"></props-table>
                <h3>Emits:</h3>
                <events-table :rows="cGroups['dialog'].components[0].emits"></events-table>
                <h3>Slots:</h3>
                <slots-table :rows="cGroups['dialog'].components[0].slots"></slots-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-button @click="$refs['dialog0'].show()">Show Dialog</ff-button>
                        <ff-dialog ref="dialog0" header="My Dialog Box" :disable-primary="!models.dialog0">
                            <p style="margin-bottom: 12px">The main message for the dialog box goes here. We can put any elements we like here.
                                For example, a text input:</p>
                            <ff-text-input placeholder="My Text Input" v-model="models.dialog0"/>
                        </ff-dialog>
                        <code>{{ cGroups['dialog'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button @click="$refs['dialog1'].show()">Show Delete Dialog</ff-button>
                        <ff-dialog ref="dialog1" header="My Other Dialog Box" confirm-label="Delete" kind="danger">
                            Are you sure you want to delete this?
                        </ff-dialog>
                        <code>{{ cGroups['dialog'].components[0].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <ff-button @click="$refs['dialog2'].show()">Show Custom Dialog</ff-button>
                        <ff-dialog ref="dialog2" header="My Custom Dialog Box">
                            <template v-slot:default>
                                Note we can override the actions too, but need to include close logic
                            </template>
                            <template v-slot:actions>
                                <ff-button kind="secondary" @click="$refs['dialog2'].close()">Secondary 1</ff-button>
                                <ff-button kind="secondary" @click="$refs['dialog2'].close()">Secondary 2</ff-button>
                                <ff-button @click="$refs['dialog2'].close()">Confirm</ff-button>
                            </template>
                        </ff-dialog>
                        <code>{{ cGroups['dialog'].components[0].examples[2].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Help Tooltip -->
                <h1>Help Tooltip</h1>
                <!-- Help Tooltip -->
                <h2 ref="ff-help"><pre>ff-help-tooltip</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['help'].components[0].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <h5>Default Position</h5>
                        <h5>Sample Header<ff-help text="Hello World"></ff-help></h5>
                        <code>{{ cGroups['help'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Alternative Position</h5>
                        <ff-help text="Hello World" position="bottom"></ff-help>
                        <code>{{ cGroups['help'].components[0].examples[1].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Form Elements -->
                <h1>Form Elements</h1>
                <!-- Text Input -->
                <h2 ref="ff-text-input"><pre>ff-text-input</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['input'].components[0].props"></props-table>
                <h3>Methods:</h3>
                <methods-table :rows="cGroups['input'].components[0].methods" @callMethod="this.$refs['text-input']?.[$event]()"></methods-table>
                <h3>Slots:</h3>
                <slots-table :rows="cGroups['input'].components[0].slots"></slots-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <h5>Simple Text Input</h5>
                        <ff-text-input placeholder="Insert something here..." v-model="models.textInput0" ref="text-input"/>
                        {{ models.textInput0 }}
                        <code>{{ cGroups['input'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Error State</h5>
                        <ff-text-input placeholder="Insert something here..." v-model="models.textInput1" :error="'This is the error'"/>
                        <code>{{ cGroups['input'].components[0].examples[3].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Type: Password</h5>
                        <ff-text-input type="password" placeholder="Password goes here..."/>
                        <code>{{ cGroups['input'].components[0].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Type: E-Mail</h5>
                        <ff-text-input type="email"/>
                        <code>{{ cGroups['input'].components[0].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Text Input with Icon (e.g. Search)</h5>
                        <ff-text-input type="email">
                            <template v-slot:icon>
                                <SearchIcon />
                            </template>
                        </ff-text-input>
                        <code>{{ cGroups['input'].components[0].examples[3].code }}</code>
                    </div>
                </div>
                <!-- Dropdown -->
                <h2 ref="ff-dropdown"><pre>ff-dropdown</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['input'].components[1].props"></props-table>
                <h3>Methods:</h3>
                <methods-table :rows="cGroups['input'].components[1].methods" @callMethod="this.$refs['dropbox-input']?.[$event]()"></methods-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <h5>Default</h5>
                        <ff-dropdown v-model="models.dropdown0" ref="dropbox-input">
                            <ff-dropdown-option label="Option 1" :value="1"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 2" :value="2"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 3" :value="3"></ff-dropdown-option>
                        </ff-dropdown>
                        {{ models.dropdown0 }}
                        <code>{{ cGroups['input'].components[1].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Button Style</h5>
                        <ff-dropdown v-model="models.dropdown1" placeholder="Dropdown Button" dropdown-style="button">
                            <ff-dropdown-option label="Option 1" :value="1"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 2" :value="2"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 3" :value="3"></ff-dropdown-option>
                        </ff-dropdown>
                        {{ models.dropdown1 }}
                        <code>{{ cGroups['input'].components[1].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Button Style &amp; Align Menu: Right</h5>
                        <ff-dropdown v-model="models.dropdown1" placeholder="Dropdown Button Right" dropdown-style="button" options-align="right">
                            <ff-dropdown-option label="Option 1" :value="1"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 2" :value="2"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 3" :value="3"></ff-dropdown-option>
                        </ff-dropdown>
                        {{ models.dropdown2 }}
                        <code>{{ cGroups['input'].components[1].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Disabled</h5>
                        <ff-dropdown v-model="models.dropdown0" :disabled="true">
                            <ff-dropdown-option label="Option 1" :value="1"></ff-dropdown-option>
                            <ff-dropdown-option label="Option 2" :value="2"></ff-dropdown-option>
                        </ff-dropdown>
                        <code>{{ cGroups['input'].components[1].examples[3].code }}</code>
                    </div>
                </div>
                <!-- Checkbox -->
                <h2 ref="ff-checkbox"><pre>ff-checkbox</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['input'].components[2].props"></props-table>
                <h3>Methods:</h3>
                <methods-table :rows="cGroups['input'].components[2].methods" @callMethod="this.$refs['checkbox-input']?.[$event]()"></methods-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <h5>Example 1: Default</h5>
                        <ff-checkbox label="My Checkbox" v-model="models.checkbox0" ref="checkbox-input"></ff-checkbox>
                        {{ models.checkbox0 }}
                        <code>{{ cGroups['input'].components[2].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 2: Disabled</h5>
                        <ff-checkbox label="My Checkbox" v-model="models.checkbox1" :disabled="true"></ff-checkbox>
                        {{ models.checkbox1 }}
                        <code>{{ cGroups['input'].components[2].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 3: Custom Label</h5>
                        <ff-checkbox label="My Checkbox" v-model="models.checkbox2">
                            <b>My <u>Custom</u> Label</b>
                        </ff-checkbox>
                        {{ models.checkbox2 }}
                        <code>{{ cGroups['input'].components[2].examples[1].code }}</code>
                    </div>
                </div>
                <!-- Radio -->
                <h2 ref="ff-radio-group"><pre>ff-radio-group</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['input'].components[3].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <h5>Example 1: Horizontal</h5>
                        <ff-radio-group v-model="models.radio0" :options="[{label: 'Option 1', value: 1, checked: false}, {label: 'Option 2', value: 2}]"></ff-radio-group>
                        {{ models.radio0 }}
                        <code>{{ cGroups['input'].components[3].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 2: Vertical &amp; Descriptions</h5>
                        <ff-radio-group v-model="models.radio1" label="We can also provide a label here" :options="[{label: 'Option 1', value: 1, checked: false, description: 'This is a description of this particular option'}, {label: 'Option 2', value: 2, description: 'Another description'}]" orientation="vertical"></ff-radio-group>
                        {{ models.radio1 }}
                        <code>{{ cGroups['input'].components[3].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 3: Disabled Option</h5>
                        <ff-radio-group v-model="models.radio2" label="We can also provide a label here" :options="[{label: 'Option 1', value: 1, checked: false, description: 'This is a description of this particular option'}, {label: 'Disabled Option', value: 2, description: 'Another description', disabled: true}]" orientation="vertical"></ff-radio-group>
                        {{ models.radio2 }}
                        <code>{{ cGroups['input'].components[3].examples[2].code }}</code>
                    </div>
                </div>
                <!-- Tile Selection -->
                <h2 ref="ff-tile-selection"><pre>ff-tile-selection</pre></h2>
                <ff-markdown-viewer class="description" :content="cGroups['input'].components[4].description"/>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['input'].components[4].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-tile-selection v-model="models.tiles0">
                            <ff-tile-selection-option value="1" label="Option 1" :description="'Markdown supported in the description, consectetur adipiscing elit ut aliquam'" price="$15.00" price-interval="/month"/>
                            <ff-tile-selection-option value="2" label="Option 2" :description="'\n * So we can offer bullet point lists\n* That help summarise the selection option'" price="$50.00" price-interval="/month"/>
                        </ff-tile-selection>
                        {{ models.tiles0 }}
                        <code>{{ cGroups['input'].components[4].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-tile-selection v-model="models.tiles1">
                            <ff-tile-selection-option value="1" label="Option 1" :description="'Markdown supported in the description, consectetur adipiscing elit ut aliquam'"/>
                            <ff-tile-selection-option value="2" label="Option 2" :description="'\n * So we can offer bullet point lists\n* That help summarise the selection option'"/>
                        </ff-tile-selection>
                        {{ models.tiles1 }}
                        <code>{{ cGroups['input'].components[4].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <ff-tile-selection>
                            <ff-tile-selection-option :editable="true" value="1" label="Option 1" :description="'Markdown supported in the description.'" price="$15.00" price-interval="/month" :meta="[{key: 'a', value: 1}, {key: 'b', value: 2}]"/>
                            <ff-tile-selection-option :editable="true" value="2" label="Option 2" :description="'\n * So we can offer bullet point lists\n* That help summarise the selection option'" price="$50.00" price-interval="/month" :meta="[{key: 'c', value: 3}, {key: 'd', value: 4}]"/>
                        </ff-tile-selection>
                        <code>{{ cGroups['input'].components[4].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <ff-tile-selection v-model="models.tiles3">
                            <ff-tile-selection-option :value="1" label="Option 1" :description="'Markdown supported in the description, consectetur adipiscing elit ut aliquam'" price="$15.00" price-interval="/month"/>
                            <ff-tile-selection-option :disabled="true" :value="2" label="Option 2" :description="'The second option is disabled.'" price="$50.00" price-interval="/month"/>
                            <ff-tile-selection-option :value="3" label="Option 3" :description="'The third option.'" price="$50.00" price-interval="/month"/>
                        </ff-tile-selection>
                        <code>{{ cGroups['input'].components[4].examples[3].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Notifications -->
                <h1>Notifications</h1>
                <ff-markdown-viewer class="description" :content="cGroups['notifications'].description"/>
                <h2 ref="ff-notification-pill"><pre>ff-notification-pill</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['notifications'].components[0].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-notification-pill :count="4" />
                        <code>{{ cGroups['notifications'].components[0].examples[0].code }}</code>
                    </div>
                </div>
                <h2 ref="ff-notification-toast"><pre>ff-notification-toast</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['notifications'].components[1].props"></props-table>
                <h3>Slots:</h3>
                <slots-table :rows="cGroups['notifications'].components[1].slots"></slots-table>
                <h3>Emits:</h3>
                <events-table :rows="cGroups['notifications'].components[1].emits"></events-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-notification-toast type="info" message="Hello World"></ff-notification-toast>
                        <code>{{ cGroups['notifications'].components[1].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <ff-notification-toast type="warning" message="Lorem ipsum dolor sit amet, consectetur adipiscing elit ut aliquam, purus sit amet luctus venenatis, lectus magna fringilla urna"></ff-notification-toast>
                        <code>{{ cGroups['notifications'].components[1].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <ff-notification-toast type="confirmation" message="Hello World"></ff-notification-toast>
                        <code>{{ cGroups['notifications'].components[1].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <ff-notification-toast type="confirmation" message="Hello World" :countdown="3000"></ff-notification-toast>
                        <code>{{ cGroups['notifications'].components[1].examples[3].code }}</code>
                    </div>
                    <div class="example">
                        <ff-notification-toast type="info" :show-close="false">
                            <template v-slot:message>
                                We can also define content using a slot instead, and use the actions slot to add our own buttons
                            </template>
                            <template v-slot:actions>
                                <ff-button @click="doSomething('Slot example')">Example</ff-button>
                            </template>
                        </ff-notification-toast>
                        <code>{{ cGroups['notifications'].components[1].examples[4].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Tabs -->
                <h1>Tabs</h1>
                <ff-markdown-viewer class="description" :content="cGroups['tabs'].description"/>
                <h2 ref="ff-tabs"><pre>ff-tabs</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['tabs'].components[0].props"></props-table>
                <h3>Emits:</h3>
                <events-table :rows="cGroups['tabs'].components[0].emits"></events-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <h5>Example 1: Horizontal Tabs</h5>
                        <ff-tabs orientation="horizontal">
                            <ff-tab label="Option 1" to="" />
                            <ff-tab label="Option 2" to="" />
                            <ff-tab label="Option 3" to="" />
                        </ff-tabs>
                        <code>{{ cGroups['tabs'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 2: Vertical Tabs</h5>
                        <ff-tabs orientation="vertical">
                            <ff-tab label="Option 1" to="" />
                            <ff-tab label="Option 2" to="" />
                            <ff-tab label="Option 3" to="" />
                        </ff-tabs>
                        <code>{{ cGroups['tabs'].components[0].examples[1].code }}</code>
                    </div>
                </div>
            </div>
            <div class="section">
                <!-- Other -->
                <h1>Utilities</h1>
                <ff-markdown-viewer class="description" :content="cGroups['utilities'].description"/>
                <h2 ref="ff-check"><pre>ff-check</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['utilities'].components[0].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <ff-check :value="true"></ff-check>
                        <code>{{ cGroups['utilities'].components[0].examples[0].code }}</code>
                    </div>
                </div>
                <h2 ref="ff-list-item"><pre>ff-list-item</pre></h2>
                <h3>Properties:</h3>
                <props-table :rows="cGroups['utilities'].components[1].props"></props-table>
            </div>
            <div class="section">
                <!-- Tooltip -->
                <h1>Tooltip</h1>
                <ff-markdown-viewer class="description" :content="dGroups['tooltip'].description"/>
                <h2 ref="ff-tooltip"><pre>ff-tooltip</pre></h2>
                <h3>Args:</h3>
                <props-table :rows="dGroups['tooltip'].components[0].props"></props-table>
                <h3>Examples:</h3>
                <div class="examples">
                    <div class="example">
                        <h5>Example 1: Default</h5>
                        <label v-ff-tooltip="'Hello World'">Hover for Default Tooltip</label>
                        <code>{{ dGroups['tooltip'].components[0].examples[0].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 2: Left</h5>
                        <ff-check v-ff-tooltip:left="'Hello World'" :value="true"></ff-check>
                        <code>{{ dGroups['tooltip'].components[0].examples[1].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 3: Top</h5>
                        <ff-button v-ff-tooltip:top="'Hello World'">Hover for Top Tooltip</ff-button>
                        <code>{{ dGroups['tooltip'].components[0].examples[2].code }}</code>
                    </div>
                    <div class="example">
                        <h5>Example 4: Bottom</h5>
                        <ff-notification-pill v-ff-tooltip:bottom="'Hello World'" :count="4">Hover for Bottom Tooltip</ff-notification-pill>
                        <code>{{ dGroups['tooltip'].components[0].examples[3].code }}</code>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script>

import EventsTable from './components/EventsTable.vue'
import MethodsTable from './components/MethodsTable.vue'
import PropsTable from './components/PropsTable.vue'
import SlotsTable from './components/SlotsTable.vue'

import buttonDocs from './data/button.docs.json'
import tableDocs from './data/table.docs.json'
import dialogDocs from './data/dialog.docs.json'
import helpDocs from './data/help.docs.json'
import inputDocs from './data/input.docs.json'
import notificationsDocs from './data/notifications.docs.json'
import tabsDocs from './data/tabs.docs.json'
import tooltipDocs from './data/tooltip.docs.json'
import utilitiesDocs from './data/utilities.docs.json'

import FFNotificationPill from '@/components/NotificationPill.vue'

// icons
import { PlusSmIcon, SearchIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

export default {
    name: 'DesignLanguage',
    components: {
        EventsTable,
        MethodsTable,
        PropsTable,
        SlotsTable,
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
            alerts: [],
            models: {
                dialog0: '',
                textInput0: '',
                dropdown0: 1,
                dropdown1: null,
                checkbox0: false,
                checkbox1: false,
                checkbox2: false,
                radio0: null,
                radio1: null,
                radio2: null,
                tiles0: null,
                tiles1: null,
                tiles3: 3
            },
            // components
            cGroups: {
                button: buttonDocs,
                'data-table': tableDocs,
                dialog: dialogDocs,
                help: helpDocs,
                input: inputDocs,
                notifications: notificationsDocs,
                tabs: tabsDocs,
                utilities: utilitiesDocs
            },
            // directives
            dGroups: {
                tooltip: tooltipDocs
            },
            data: {
                table0: {
                    columns: [{
                        key: 'colA',
                        label: 'Column A',
                        sortable: false,
                        class: ['classes-can-go-here-too'],
                        style: { width: '60%' }
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
                    }, {
                        colA: 'This is Row 3, Column A',
                        colB: 12,
                        colC: 2.8
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
                },
                table4: {
                    search: '',
                    columns: [{
                        key: 'fName',
                        label: 'First Name',
                        sortable: true
                    }, {
                        key: 'sName',
                        label: 'Last Name',
                        sortable: true
                    }, {
                        key: 'number',
                        label: 'Number',
                        sortable: true,
                        component: {
                            is: markRaw(FFNotificationPill),
                            map: {
                                count: 'number'
                            },
                            extraProps: {
                                color: 'red'
                            }
                        }
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
                table4DocVersion: {
                    columns: [{
                        key: 'fName',
                        label: 'First Name',
                        sortable: true
                    }, {
                        key: 'sName',
                        label: 'Last Name',
                        sortable: true
                    }, {
                        key: 'number',
                        label: 'Number',
                        sortable: true,
                        component: {
                            is: 'markRaw(FFNotificationPill)',
                            map: {
                                count: 'number'
                            },
                            extraProps: {
                                color: 'red'
                            }
                        }
                    }]
                }
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
        },
        doSomething (message) {
            this.displayAlert(message, 'info')
        },
        /**
         * @param {string} msg The message to show
         * @param {'info'|'confirmation'|'warning'} [type] Toast style
         * @param {number} [countdown] How long to show (defaults to 3s)
         */
        displayAlert (msg, type, countdown) {
            this.alerts.push({
                message: msg,
                type,
                countdown,
                timestamp: Date.now()
            })
        },
        clearAlert (i) {
            this.alerts.splice(this.alerts.length - 1 - i, 1)
        }
    }
}
</script>

<style lang="scss">
@import "./index.scss";
</style>
