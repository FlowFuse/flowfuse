import { openBlock, createElementBlock, normalizeClass, renderSlot, createCommentVNode, resolveComponent, createElementVNode, toDisplayString, createVNode, withCtx, createTextVNode, withKeys, createBlock, withDirectives, vModelCheckbox, Fragment, renderList } from 'vue';
import { ChevronDownIcon } from '@heroicons/vue/solid';

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
  return (openBlock(), createElementBlock("button", {
    class: normalizeClass(["ff-btn", 'ff-btn--' + $props.kind + ($options.hasIcon ? ' ff-btn-icon' : '') + ($props.size === 'small' ? ' ff-btn-small' : '') + ($props.size === 'full-width' ? ' ff-btn-fwidth' : '')]),
    type: "button",
    onClick: _cache[0] || (_cache[0] = $event => ($options.go()))
  }, [
    ($options.hasIconLeft)
      ? (openBlock(), createElementBlock("span", _hoisted_1$7, [
          renderSlot(_ctx.$slots, "icon-left")
        ]))
      : createCommentVNode("v-if", true),
    ($options.isIconOnly)
      ? (openBlock(), createElementBlock("span", _hoisted_2$4, [
          renderSlot(_ctx.$slots, "icon")
        ]))
      : createCommentVNode("v-if", true),
    renderSlot(_ctx.$slots, "default"),
    ($options.hasIconRight)
      ? (openBlock(), createElementBlock("span", _hoisted_3$3, [
          renderSlot(_ctx.$slots, "icon-right")
        ]))
      : createCommentVNode("v-if", true)
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
const _hoisted_5 = /*#__PURE__*/createTextVNode("Cancel");
const _hoisted_6 = /*#__PURE__*/createTextVNode("Confirm");
const _hoisted_7 = /*#__PURE__*/createElementVNode("div", { class: "ff-dialog-backdrop" }, null, -1 /* HOISTED */);

function render$7(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_ff_button = resolveComponent("ff-button");

  return (openBlock(), createElementBlock("div", {
    class: normalizeClass(["ff-dialog-container", 'ff-dialog-container--' + ($props.open ? 'open' : 'closed')])
  }, [
    createElementVNode("div", _hoisted_1$6, [
      createElementVNode("div", _hoisted_2$3, toDisplayString($props.header), 1 /* TEXT */),
      createElementVNode("div", _hoisted_3$2, [
        renderSlot(_ctx.$slots, "default")
      ]),
      createElementVNode("div", _hoisted_4, [
        renderSlot(_ctx.$slots, "actions", {}, () => [
          createVNode(_component_ff_button, {
            onClick: _cache[0] || (_cache[0] = $event => (_ctx.$emit('cancel'))),
            kind: "secondary"
          }, {
            default: withCtx(() => [
              _hoisted_5
            ]),
            _: 1 /* STABLE */
          }),
          createVNode(_component_ff_button, {
            onClick: _cache[1] || (_cache[1] = $event => (_ctx.$emit('confirm')))
          }, {
            default: withCtx(() => [
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
        error: {
            type: String,
            default: ''
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
  return (openBlock(), createElementBlock("input", {
    type: $props.password ? 'password' : 'text',
    class: normalizeClass(["ff-input ff-text-input", {'ff-input--error': $props.error}]),
    placeholder: $props.placeholder,
    disabled: $props.disabled,
    value: $props.modelValue,
    onChange: _cache[0] || (_cache[0] = $event => (_ctx.$emit('update:modelValue', $event.target.value))),
    onInput: _cache[1] || (_cache[1] = $event => (_ctx.$emit('update:modelValue', $event.target.value))),
    onEnter: _cache[2] || (_cache[2] = $event => (_ctx.$emit('enter', $event))),
    onBlur: _cache[3] || (_cache[3] = $event => (_ctx.$emit('blur'))),
    onKeyup: _cache[4] || (_cache[4] = withKeys($event => (_ctx.$emit('enter', _ctx.$evt)), ["enter"]))
  }, null, 42 /* CLASS, PROPS, HYDRATE_EVENTS */, _hoisted_1$5))
}

script$7.render = render$6;
script$7.__file = "src/components/form/TextInput.vue";

var script$6 = {
    name: 'ff-dropdown',
    components: {
        ChevronDownIcon
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
  const _component_ChevronDownIcon = resolveComponent("ChevronDownIcon");
  const _component_ff_button = resolveComponent("ff-button");

  return (openBlock(), createElementBlock("div", {
    class: normalizeClass(["ff-dropdown", 'ff-dropdown--' + ($data.isOpen ? 'open' : 'closed')])
  }, [
    ($props.dropdownStyle === 'select')
      ? (openBlock(), createElementBlock("div", {
          key: 0,
          onClick: _cache[0] || (_cache[0] = $event => ($options.open()))
        }, [
          createElementVNode("div", _hoisted_1$4, [
            createTextVNode(toDisplayString($data.selected?.label || $props.placeholder) + " ", 1 /* TEXT */),
            createVNode(_component_ChevronDownIcon, { class: "ff-icon" })
          ])
        ]))
      : ($props.dropdownStyle === 'button')
        ? (openBlock(), createBlock(_component_ff_button, {
            key: 1,
            onClick: _cache[1] || (_cache[1] = $event => ($options.open()))
          }, {
            "icon-right": withCtx(() => [
              createVNode(_component_ChevronDownIcon)
            ]),
            default: withCtx(() => [
              createTextVNode(toDisplayString($props.placeholder) + " ", 1 /* TEXT */)
            ]),
            _: 1 /* STABLE */
          }))
        : createCommentVNode("v-if", true),
    createElementVNode("div", {
      class: normalizeClass(["ff-dropdown-options", {'ff-dropdown-options--full-width': $props.dropdownStyle === 'select', 'ff-dropdown-options--fit': $props.dropdownStyle === 'button', 'ff-dropdown-options--align-left': $props.optionsAlign === 'left', 'ff-dropdown-options--align-right': $props.optionsAlign === 'right'}])
    }, [
      renderSlot(_ctx.$slots, "default")
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
  return (openBlock(), createElementBlock("div", {
    class: "ff-dropdown-option",
    onClick: _cache[0] || (_cache[0] = $event => ($options.select()))
  }, toDisplayString($props.label), 1 /* TEXT */))
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
  return (openBlock(), createElementBlock("label", _hoisted_1$3, [
    withDirectives(createElementVNode("input", {
      type: "checkbox",
      value: $props.modelValue,
      "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => (($options.model) = $event))
    }, null, 8 /* PROPS */, _hoisted_2$2), [
      [vModelCheckbox, $options.model]
    ]),
    createElementVNode("span", {
      class: "checkbox",
      checked: $options.model
    }, null, 8 /* PROPS */, _hoisted_3$1),
    createElementVNode("label", {
      onClick: _cache[1] || (_cache[1] = $event => ($options.model = !$options.model))
    }, [
      renderSlot(_ctx.$slots, "default", {}, () => [
        createTextVNode(toDisplayString($props.label), 1 /* TEXT */)
      ])
    ])
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
  const _component_ff_radio_button = resolveComponent("ff-radio-button");

  return (openBlock(), createElementBlock("div", {
    class: normalizeClass(["ff-radio-group", 'ff-radio-group--' + $props.orientation])
  }, [
    ($props.label)
      ? (openBlock(), createElementBlock("label", _hoisted_1$2, toDisplayString($props.label), 1 /* TEXT */))
      : createCommentVNode("v-if", true),
    (openBlock(true), createElementBlock(Fragment, null, renderList($data.internalOptions, (option) => {
      return (openBlock(), createBlock(_component_ff_radio_button, {
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
  return (openBlock(), createElementBlock("label", {
    class: "ff-radio-btn",
    onClick: _cache[0] || (_cache[0] = $event => ($options.select($props.value)))
  }, [
    createElementVNode("input", {
      type: "radio",
      value: $props.value
    }, null, 8 /* PROPS */, _hoisted_1$1),
    createElementVNode("span", {
      class: "checkbox",
      checked: $props.checked
    }, null, 8 /* PROPS */, _hoisted_2$1),
    createElementVNode("label", null, toDisplayString($props.label), 1 /* TEXT */)
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
  return (openBlock(), createElementBlock("div", _hoisted_1, [
    createElementVNode("ul", {
      class: normalizeClass(["ff-tabs", 'ff-tabs--' + $props.orientation])
    }, [
      (openBlock(true), createElementBlock(Fragment, null, renderList($data.tabs, (tab, $index) => {
        return (openBlock(), createElementBlock("li", {
          key: tab.label,
          onClick: $event => ($options.selectTab($index)),
          class: normalizeClass(["ff-tab-option", {'ff-tab-option--active': tab.isActive}])
        }, toDisplayString(tab.label), 11 /* TEXT, CLASS, PROPS */, _hoisted_2))
      }), 128 /* KEYED_FRAGMENT */))
    ], 2 /* CLASS */),
    createElementVNode("div", _hoisted_3, [
      renderSlot(_ctx.$slots, "default")
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

export { plugin as default };
