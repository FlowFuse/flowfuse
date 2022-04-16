'use strict';

var vue = require('vue');
var solid = require('@heroicons/vue/solid');

var script$9 = {
    name: 'ff-button',
    props: {
        type: {
            default: 'button', // "button" or "submit"
            type: String
        },
        kind: {
            default: 'primary',
            type: String // "primary", "secondary", "tertiary"
        },
        size: {
            default: 'normal',
            type: String // "small", "normal", "full-width"
        },
        to: {
            default: null
        }
    },
    computed: {
        hasIcon: function () {
            return this.$slots['icon-left'] || this.$slots['icon-right'] || this.$slots.icon
        },
        hasIconLeft: function () {
            return this.$slots['icon-left']
        },
        hasIconRight: function () {
            return this.$slots['icon-right']
        },
        isIconOnly: function () {
            return this.$slots.icon
        }
    },
    methods: {
        go: function () {
            if (this.to) {
                this.$router.push(this.to);
            }
        }
    }
};

const _hoisted_1$7 = {
  key: 0,
  class: "ff-btn--icon ff-btn--icon-left"
};
const _hoisted_2$4 = {
  key: 1,
  class: "ff-btn--icon"
};
const _hoisted_3$3 = {
  key: 2,
  class: "ff-btn--icon ff-btn--icon-right"
};

function render$8(_ctx, _cache, $props, $setup, $data, $options) {
  return (vue.openBlock(), vue.createElementBlock("button", {
    class: vue.normalizeClass(["ff-btn", 'ff-btn--' + $props.kind + ($options.hasIcon ? ' ff-btn-icon' : '') + ($props.size === 'small' ? ' ff-btn-small' : '') + ($props.size === 'full-width' ? ' ff-btn-fwidth' : '')]),
    type: "button",
    onClick: _cache[0] || (_cache[0] = $event => ($options.go()))
  }, [
    ($options.hasIconLeft)
      ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_1$7, [
          vue.renderSlot(_ctx.$slots, "icon-left")
        ]))
      : vue.createCommentVNode("v-if", true),
    ($options.isIconOnly)
      ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_2$4, [
          vue.renderSlot(_ctx.$slots, "icon")
        ]))
      : vue.createCommentVNode("v-if", true),
    vue.renderSlot(_ctx.$slots, "default"),
    ($options.hasIconRight)
      ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_3$3, [
          vue.renderSlot(_ctx.$slots, "icon-right")
        ]))
      : vue.createCommentVNode("v-if", true)
  ], 2 /* CLASS */))
}

script$9.render = render$8;
script$9.__file = "src/components/Button.vue";

var script$8 = {
    name: 'ff-dialog',
    props: {
        open: {
            type: Boolean,
            default: false
        },
        header: {
            type: String,
            default: 'Dialog Box'
        }
    },
    emits: ['cancel', 'confirm']
};

const _hoisted_1$6 = { class: "ff-dialog-box" };
const _hoisted_2$3 = { class: "ff-dialog-header" };
const _hoisted_3$2 = { class: "ff-dialog-content" };
const _hoisted_4 = { class: "ff-dialog-actions" };
const _hoisted_5 = /*#__PURE__*/vue.createTextVNode("Cancel");
const _hoisted_6 = /*#__PURE__*/vue.createTextVNode("Confirm");
const _hoisted_7 = /*#__PURE__*/vue.createElementVNode("div", { class: "ff-dialog-backdrop" }, null, -1 /* HOISTED */);

function render$7(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_ff_button = vue.resolveComponent("ff-button");

  return (vue.openBlock(), vue.createElementBlock("div", {
    class: vue.normalizeClass(["ff-dialog-container", 'ff-dialog-container--' + ($props.open ? 'open' : 'closed')])
  }, [
    vue.createElementVNode("div", _hoisted_1$6, [
      vue.createElementVNode("div", _hoisted_2$3, vue.toDisplayString($props.header), 1 /* TEXT */),
      vue.createElementVNode("div", _hoisted_3$2, [
        vue.renderSlot(_ctx.$slots, "default")
      ]),
      vue.createElementVNode("div", _hoisted_4, [
        vue.renderSlot(_ctx.$slots, "actions", {}, () => [
          vue.createVNode(_component_ff_button, {
            onClick: _cache[0] || (_cache[0] = $event => (_ctx.$emit('cancel'))),
            kind: "secondary"
          }, {
            default: vue.withCtx(() => [
              _hoisted_5
            ]),
            _: 1 /* STABLE */
          }),
          vue.createVNode(_component_ff_button, {
            onClick: _cache[1] || (_cache[1] = $event => (_ctx.$emit('confirm')))
          }, {
            default: vue.withCtx(() => [
              _hoisted_6
            ]),
            _: 1 /* STABLE */
          })
        ])
      ])
    ]),
    _hoisted_7
  ], 2 /* CLASS */))
}

script$8.render = render$7;
script$8.__file = "src/components/DialogBox.vue";

var script$7 = {
    name: 'ff-text-input',
    emits: ['update:modelValue', 'input', 'blur', 'keyup'],
    props: {
        // broker standard text-input props
        disabled: {
            type: Boolean,
            default: false
        },
        placeholder: {
            type: String,
            default: ''
        },
        // flowforge specific props
        size: {
            default: 'normal',
            type: String // "small", "normal"
        },
        password: {
            default: false,
            type: Boolean
        },
        // v-model
        modelValue: {
            type: String,
            default: '',
            required: true
        }
    }
};

const _hoisted_1$5 = ["type", "placeholder", "disabled", "value"];

function render$6(_ctx, _cache, $props, $setup, $data, $options) {
  return (vue.openBlock(), vue.createElementBlock("input", {
    type: $props.password ? 'password' : 'text',
    class: "ff-input ff-text-input",
    placeholder: $props.placeholder,
    disabled: $props.disabled,
    value: $props.modelValue,
    onChange: _cache[0] || (_cache[0] = $event => (_ctx.$emit('update:modelValue', $event.target.value))),
    onInput: _cache[1] || (_cache[1] = $event => (_ctx.$emit('update:modelValue', $event.target.value))),
    onBlur: _cache[2] || (_cache[2] = $event => (_ctx.$emit('blur'))),
    onKeyup: _cache[3] || (_cache[3] = vue.withKeys($event => (_ctx.$emit('keyup')), ["enter"]))
  }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_1$5))
}

script$7.render = render$6;
script$7.__file = "src/components/form/TextInput.vue";

var script$6 = {
    name: 'ff-dropdown',
    components: {
        ChevronDownIcon: solid.ChevronDownIcon
    },
    props: {
        modelValue: {
            default: null
        },
        placeholder: {
            default: 'Please Select'
        },
        dropdownStyle: {
            default: 'select'
        },
        optionsAlign: {
            default: 'left',
            type: String
        }
    },
    data () {
        return {
            isOpen: false,
            selected: null
        }
    },
    computed: {
        value: {
            get () {
                return this.selected
            },
            set (selected) {
                this.selected = selected;
                this.$emit('update:modelValue', selected.value);
                this.isOpen = false;
            }
        }
    },
    methods: {
        open: function () {
            this.isOpen = !this.isOpen;
        }
    }
};

const _hoisted_1$4 = { class: "ff-dropdown-selected" };

function render$5(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_ChevronDownIcon = vue.resolveComponent("ChevronDownIcon");
  const _component_ff_button = vue.resolveComponent("ff-button");

  return (vue.openBlock(), vue.createElementBlock("div", {
    class: vue.normalizeClass(["ff-dropdown", 'ff-dropdown--' + ($data.isOpen ? 'open' : 'closed')])
  }, [
    ($props.dropdownStyle === 'select')
      ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 0,
          onClick: _cache[0] || (_cache[0] = $event => ($options.open()))
        }, [
          vue.createElementVNode("div", _hoisted_1$4, [
            vue.createTextVNode(vue.toDisplayString($data.selected?.label || $props.placeholder) + " ", 1 /* TEXT */),
            vue.createVNode(_component_ChevronDownIcon, { class: "ff-icon" })
          ])
        ]))
      : ($props.dropdownStyle === 'button')
        ? (vue.openBlock(), vue.createBlock(_component_ff_button, {
            key: 1,
            onClick: _cache[1] || (_cache[1] = $event => ($options.open()))
          }, {
            "icon-right": vue.withCtx(() => [
              vue.createVNode(_component_ChevronDownIcon)
            ]),
            default: vue.withCtx(() => [
              vue.createTextVNode(vue.toDisplayString($props.placeholder) + " ", 1 /* TEXT */)
            ]),
            _: 1 /* STABLE */
          }))
        : vue.createCommentVNode("v-if", true),
    vue.createElementVNode("div", {
      class: vue.normalizeClass(["ff-dropdown-options", {'ff-dropdown-options--full-width': $props.dropdownStyle === 'select', 'ff-dropdown-options--fit': $props.dropdownStyle === 'button', 'ff-dropdown-options--align-left': $props.optionsAlign === 'left', 'ff-dropdown-options--align-right': $props.optionsAlign === 'right'}])
    }, [
      vue.renderSlot(_ctx.$slots, "default")
    ], 2 /* CLASS */)
  ], 2 /* CLASS */))
}

script$6.render = render$5;
script$6.__file = "src/components/form/Dropdown.vue";

var script$5 = {
    name: 'ff-dropdown-option',
    props: {
        value: {
            default: null
        },
        label: {
            default: ''
        }
    },
    methods: {
        select () {
            this.$parent.value = {
                value: this.value,
                label: this.label
            };
        }
    }
};

function render$4(_ctx, _cache, $props, $setup, $data, $options) {
  return (vue.openBlock(), vue.createElementBlock("div", {
    class: "ff-dropdown-option",
    onClick: _cache[0] || (_cache[0] = $event => ($options.select()))
  }, vue.toDisplayString($props.label), 1 /* TEXT */))
}

script$5.render = render$4;
script$5.__file = "src/components/form/DropdownOption.vue";

var script$4 = {
    name: 'ff-checkbox',
    props: ['label', 'modelValue'],
    emits: ['update:modelValue'],
    computed: {
        model: {
            get () {
                return this.modelValue
            },
            set (value) {
                this.$emit('update:modelValue', value);
            }
        }
    }

};

const _hoisted_1$3 = { class: "ff-checkbox" };
const _hoisted_2$2 = ["value"];
const _hoisted_3$1 = ["checked"];

function render$3(_ctx, _cache, $props, $setup, $data, $options) {
  return (vue.openBlock(), vue.createElementBlock("label", _hoisted_1$3, [
    vue.withDirectives(vue.createElementVNode("input", {
      type: "checkbox",
      value: $props.modelValue,
      "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => (($options.model) = $event))
    }, null, 8 /* PROPS */, _hoisted_2$2), [
      [vue.vModelCheckbox, $options.model]
    ]),
    vue.createElementVNode("span", {
      class: "checkbox",
      checked: $options.model
    }, null, 8 /* PROPS */, _hoisted_3$1),
    vue.createElementVNode("label", {
      onClick: _cache[1] || (_cache[1] = $event => ($options.model = !$options.model))
    }, vue.toDisplayString($props.label), 1 /* TEXT */)
  ]))
}

script$4.render = render$3;
script$4.__file = "src/components/form/Checkbox.vue";

var script$3 = {
    name: 'ff-radio-group',
    props: {
        modelValue: {
            default: null
        },
        label: {
            default: '',
            type: String
        },
        orientation: {
            default: 'horizontal',
            type: String
        },
        options: {
            default: null,
            type: Array
        }
    },
    data () {
        return {
            internalOptions: this.options
        }
    },
    mounted () {
        // make sure we don't have two options checked
        let hasCheck = false;
        this.options.forEach((option, i) => {
            this.internalOptions[i].checked = (option.checked && !hasCheck) ? option.checked : false;
            if (this.internalOptions[i].checked) {
                hasCheck = true;
                this.$emit('update:modelValue', option.value);
            }
        });
    },
    methods: {
        select: function (val) {
            this.options.forEach((option, i) => {
                this.internalOptions[i].checked = (option.value === val);
            });
            this.$emit('update:modelValue', val);
        }
    }
};

const _hoisted_1$2 = {
  key: 0,
  class: "ff-radio-group-label"
};

function render$2(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_ff_radio_button = vue.resolveComponent("ff-radio-button");

  return (vue.openBlock(), vue.createElementBlock("div", {
    class: vue.normalizeClass(["ff-radio-group", 'ff-radio-group--' + $props.orientation])
  }, [
    ($props.label)
      ? (vue.openBlock(), vue.createElementBlock("label", _hoisted_1$2, vue.toDisplayString($props.label), 1 /* TEXT */))
      : vue.createCommentVNode("v-if", true),
    (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList($data.internalOptions, (option) => {
      return (vue.openBlock(), vue.createBlock(_component_ff_radio_button, {
        key: option.label,
        value: option.value,
        label: option.label,
        checked: option.checked,
        onSelect: $options.select
      }, null, 8 /* PROPS */, ["value", "label", "checked", "onSelect"]))
    }), 128 /* KEYED_FRAGMENT */))
  ], 2 /* CLASS */))
}

script$3.render = render$2;
script$3.__file = "src/components/form/RadioGroup.vue";

var script$2 = {
    name: 'ff-radio-button',
    props: ['label', 'value', 'checked'],
    emits: ['select'],
    methods: {
        select: function (value) {
            this.$emit('select', value);
        }
    }
};

const _hoisted_1$1 = ["value"];
const _hoisted_2$1 = ["checked"];

function render$1(_ctx, _cache, $props, $setup, $data, $options) {
  return (vue.openBlock(), vue.createElementBlock("label", {
    class: "ff-radio-btn",
    onClick: _cache[0] || (_cache[0] = $event => ($options.select($props.value)))
  }, [
    vue.createElementVNode("input", {
      type: "radio",
      value: $props.value
    }, null, 8 /* PROPS */, _hoisted_1$1),
    vue.createElementVNode("span", {
      class: "checkbox",
      checked: $props.checked
    }, null, 8 /* PROPS */, _hoisted_2$1),
    vue.createElementVNode("label", null, vue.toDisplayString($props.label), 1 /* TEXT */)
  ]))
}

script$2.render = render$1;
script$2.__file = "src/components/form/RadioButton.vue";

var script$1 = {
    name: 'ff-tabs',
    props: {
        orientation: {
            default: '',
            type: String
        }
    },
    emits: ['tab-selected'],
    data () {
        return {
            tabs: [],
            active: -1
        }
    },
    watch: {
        active: function () {
            console.log(this.active);
        }
    },
    created () {
        console.log(this.orientation);
        this.tabs = this.$slots.default().map((vnode) => {
            console.log(vnode);
            return vnode.props
        });
    },
    mounted () {
        this.selectTab(0);
    },
    methods: {
        selectTab (i) {
            this.selectedIndex = i;

            // loop over all the tabs
            this.tabs.forEach((tab, index) => {
                tab.isActive = (index === i);
                if (tab.isActive) {
                    this.$emit('tab-selected', tab);
                }
            });
        }
    }
};

const _hoisted_1 = { ref: "ff-tabs" };
const _hoisted_2 = ["onClick"];
const _hoisted_3 = { class: "ff-tabs-content" };

function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (vue.openBlock(), vue.createElementBlock("div", _hoisted_1, [
    vue.createElementVNode("ul", {
      class: vue.normalizeClass(["ff-tabs", 'ff-tabs--' + $props.orientation])
    }, [
      (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList($data.tabs, (tab, $index) => {
        return (vue.openBlock(), vue.createElementBlock("li", {
          key: tab.label,
          onClick: $event => ($options.selectTab($index)),
          class: vue.normalizeClass(["ff-tab-option", {'ff-tab-option--active': tab.isActive}])
        }, vue.toDisplayString(tab.label), 11 /* TEXT, CLASS, PROPS */, _hoisted_2))
      }), 128 /* KEYED_FRAGMENT */))
    ], 2 /* CLASS */),
    vue.createElementVNode("div", _hoisted_3, [
      vue.renderSlot(_ctx.$slots, "default")
    ])
  ], 512 /* NEED_PATCH */))
}

script$1.render = render;
script$1.__file = "src/components/tabs/Tabs.vue";

var script = {
    name: 'ff-tab',
    props: {
        label: {
            default: 'Tab',
            type: String
        },
        to: {
            default: '',
            type: String
        }
    },
    render: () => {
        return null
    }
};

script.__file = "src/components/tabs/Tab.vue";

var components = {
    FFButton: script$9,
    FFDialogBox: script$8,
    // Form Elements
    FFTextInput: script$7,
    FFDropdown: script$6,
    FFDropdownOption: script$5,
    FFCheckbox: script$4,
    FFRadioGroup: script$3,
    FFRadioButton: script$2,
    // Tabs
    FFTabs: script$1,
    FFTab: script
};

/* eslint-disable no-prototype-builtins */

const plugin = {
    install (Vue) {
        for (const prop in components) {
            if (components.hasOwnProperty(prop)) {
                const component = components[prop];
                Vue.component(component.name, component);
            }
        }
    }
};

module.exports = plugin;
