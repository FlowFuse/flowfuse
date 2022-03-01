'use strict';

var vue = require('vue');

var script = {
    name: 'ff-button',
    props: {
        kind: {
            default: 'primary',
            type: String // "primary", "secondary", "tertiary"
        }
    },
    computed: {
        hasIcon: function () {
            return this.$slots['icon-left'] || this.$slots['icon-right']
        },
        hasIconLeft: function () {
            return this.$slots['icon-left']
        },
        hasIconRight: function () {
            return this.$slots['icon-right']
        }
    }
};

const _hoisted_1 = {
  key: 0,
  class: "ff-btn--icon ff-btn--icon-left"
};
const _hoisted_2 = {
  key: 1,
  class: "ff-btn--icon ff-btn--icon-right"
};

function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (vue.openBlock(), vue.createElementBlock("button", {
    class: vue.normalizeClass(["ff-btn", 'ff-btn--' + $props.kind + ' ' + ($options.hasIcon ? 'ff-btn-icon' : '')])
  }, [
    ($options.hasIconLeft)
      ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_1, [
          vue.renderSlot(_ctx.$slots, "icon-left")
        ]))
      : vue.createCommentVNode("v-if", true),
    vue.renderSlot(_ctx.$slots, "default"),
    ($options.hasIconRight)
      ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_2, [
          vue.renderSlot(_ctx.$slots, "icon-right")
        ]))
      : vue.createCommentVNode("v-if", true)
  ], 2 /* CLASS */))
}

script.render = render;
script.__file = "src/components/Button.vue";

var components = { FFButton: script };

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
