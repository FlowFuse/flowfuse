import { openBlock, createElementBlock, normalizeClass, renderSlot, createCommentVNode, withKeys } from 'vue';

var script$1 = {
    name: 'ff-button',
    props: {
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

const _hoisted_1$1 = {
  key: 0,
  class: "ff-btn--icon ff-btn--icon-left"
};
const _hoisted_2 = {
  key: 1,
  class: "ff-btn--icon"
};
const _hoisted_3 = {
  key: 2,
  class: "ff-btn--icon ff-btn--icon-right"
};

function render$1(_ctx, _cache, $props, $setup, $data, $options) {
  return (openBlock(), createElementBlock("button", {
    class: normalizeClass(["ff-btn", 'ff-btn--' + $props.kind + ($options.hasIcon ? ' ff-btn-icon' : '') + ($props.size === 'small' ? ' ff-btn-small' : '') + ($props.size === 'full-width' ? ' ff-btn-fwidth' : '')]),
    onClick: _cache[0] || (_cache[0] = $event => ($options.go()))
  }, [
    ($options.hasIconLeft)
      ? (openBlock(), createElementBlock("span", _hoisted_1$1, [
          renderSlot(_ctx.$slots, "icon-left")
        ]))
      : createCommentVNode("v-if", true),
    ($options.isIconOnly)
      ? (openBlock(), createElementBlock("span", _hoisted_2, [
          renderSlot(_ctx.$slots, "icon")
        ]))
      : createCommentVNode("v-if", true),
    renderSlot(_ctx.$slots, "default"),
    ($options.hasIconRight)
      ? (openBlock(), createElementBlock("span", _hoisted_3, [
          renderSlot(_ctx.$slots, "icon-right")
        ]))
      : createCommentVNode("v-if", true)
  ], 2 /* CLASS */))
}

script$1.render = render$1;
script$1.__file = "src/components/Button.vue";

var script = {
    name: 'ff-text-input',
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
    },
    emits: ['update:modelValue', 'input', 'blur', 'keyup']
};

const _hoisted_1 = ["type", "placeholder", "value"];

function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (openBlock(), createElementBlock("input", {
    type: $props.password ? 'password' : 'text',
    class: "ff-input ff-text-input",
    placeholder: $props.placeholder,
    value: $props.modelValue,
    onChange: _cache[0] || (_cache[0] = $event => (_ctx.$emit('update:modelValue', $event.target.value))),
    onInput: _cache[1] || (_cache[1] = $event => (_ctx.$emit('update:modelValue', $event.target.value))),
    onBlur: _cache[2] || (_cache[2] = $event => (_ctx.$emit('blur'))),
    onKeyup: _cache[3] || (_cache[3] = withKeys($event => (_ctx.$emit('keyup')), ["enter"]))
  }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_1))
}

script.render = render;
script.__file = "src/components/TextInput.vue";

var components = { FFButton: script$1, FFTextInput: script };

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
