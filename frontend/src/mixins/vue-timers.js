// Based on works in https://github.com/Kelin2025/vue-timers
// The original MIT License is included below as per the original author's request

// =================================================================================================
// Copyright (c) 2017 Anton Kosykh
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// =================================================================================================

// Rewritten for vue3, by @flowforge

/**
 * A timer mixin to simplify the use of timers in components.
 * @module vue-timers
 * @example
 * // in your component
 * import { VueTimersMixin } from './vue-timers.js'
 * export default {
 *   mixins: [VueTimersMixin],
 *   timers: {
 *     timer1: { time: 1000, repeat: true, immediate: true, autostart: true },
 *     timer2: { time: 1000, repeat: true, immediate: false, autostart: false, callback: this.timerTick }
 *   },
 *   mounted () {
 *     this.$timer.start('timer2')
 *   }
 *   methods: {
 *     timer1 () { // do something },
 *     timerTick () { // do something }
 * },
 */

const VueTimers = {

    data: function () {
        if (!this.$options.timers) return {}
        this.$options.timers = normalizeOptions(this.$options.timers, this)
        return {
            timers: generateData(this.$options.timers)
        }
    },

    created: function () {
        if (!this.$options.timers) return
        const vm = this
        const data = vm.timers
        const options = vm.$options.timers
        vm.$timer = {
            start: function (name) {
                if (process.env.NODE_ENV !== 'production' && !(name in options)) {
                    throw new ReferenceError(
                        '[vue-timers.start] Cannot find timer ' + name
                    )
                }
                if (data[name].isRunning) return
                data[name].isRunning = true
                data[name].instance = generateTimer(
                    set('time', data[name].time, options[name]),
                    vm
                )
                if (options[name].immediate) {
                    // vm.$emit('timer-tick:' + name)
                    options[name].callback()
                }
                // vm.$emit('timer-start:' + name)
            },

            stop: function (name) {
                if (process.env.NODE_ENV !== 'production' && !(name in options)) {
                    throw new ReferenceError(
                        '[vue-timers.stop] Cannot find timer ' + name
                    )
                }
                if (!data[name].isRunning) return
                clearTimer(options[name].repeat)(data[name].instance)
                data[name].isRunning = false
                // vm.$emit('timer-stop:' + name)
            },

            restart: function (name) {
                if (process.env.NODE_ENV !== 'production' && !(name in options)) {
                    throw new ReferenceError(
                        '[vue-timers.restart] Cannot find timer ' + name
                    )
                }
                this.stop(name)
                this.start(name)
                // vm.$emit('timer-restart:' + name)
            }
        }
    },

    mounted: function () {
        if (!this.$options.timers) return
        const vm = this
        const options = vm.$options.timers
        Object.keys(options).forEach(function (key) {
            if (options[key].autostart) {
                vm.$timer.start(key)
            }
        })
    },

    activated: function () {
        if (!this.$options.timers) { return }
        const vm = this
        const data = vm.timers
        const options = vm.$options.timers
        Object.keys(options).forEach(function (key) {
            if (options[key].isSwitchTab && data[key].instance) {
                vm.$timer.start(key)
            }
        })
    },

    deactivated: function () {
        if (!this.$options.timers) { return }
        const vm = this
        const data = vm.timers
        const options = vm.$options.timers
        Object.keys(options).forEach(function (key) {
            if (options[key].isSwitchTab && data[key].instance) {
                vm.$timer.stop(key)
            }
        })
    },
    beforeUnmount: function () {
        if (!this.$options.timers) { return }
        const vm = this
        Object.keys(vm.$options.timers).forEach(function (key) {
            vm.$timer.stop(key)
        })
    }
}

export default function install (Vue, _options) {
    Vue.config.optionMergeStrategies.timers = Vue.config.optionMergeStrategies.methods
    Vue.mixin(VueTimers)
}

if (typeof window !== 'undefined' && window.Vue) {
    install(window.Vue)
}

export function timer (name, time, options) {
    return Object.assign({ name, time }, options)
}

export const VueTimersMixin = VueTimers

function set (key, value, obj) {
    const clone = Object.assign({}, obj)
    clone[key] = value
    return clone
}

function generateData (timers) {
    return Object.keys(timers).reduce(function (acc, cur) {
        return set(
            cur,
            {
                isRunning: false,
                time: timers[cur].time || 0,
                instance: null
            },
            acc
        )
    }, {})
}

function setTimer (repeat) {
    return repeat ? setInterval : setTimeout
}

function clearTimer (repeat) {
    return repeat ? clearInterval : clearTimeout
}

function generateTimer (options, vm) {
    return setTimer(options.repeat)(function () {
        // vm.$emit('timer-tick:' + options.name)
        options.callback()
    }, options.time)
}

function normalizeConfig (config, vm) {
    if (process.env.NODE_ENV !== 'production') {
        if (!config.name) {
            throw new Error('[vue-timers.create] name is required')
        }
        if (!config.callback && typeof vm[config.name] !== 'function') {
            throw new ReferenceError(
                '[vue-timers.create] Cannot find method ' + config.name
            )
        }
        if (config.callback && typeof config.callback !== 'function') {
            throw new TypeError(
                '[vue-timers.create] Timer callback should be a function, ' +
            typeof config.callback +
            ' given'
            )
        }
    }
    return {
        name: config.name,
        time: config.time || 0,
        repeat: 'repeat' in config ? config.repeat : false,
        immediate: 'immediate' in config ? config.immediate : false,
        autostart: 'autostart' in config ? config.autostart : false,
        isSwitchTab: 'isSwitchTab' in config ? config.isSwitchTab : false,
        callback: (config.callback && config.callback.bind(vm)) || vm[config.name]
    }
}

function normalizeOptions (options, vm) {
    if (Array.isArray(options)) {
        return options.reduce(function (res, config) {
            return set(config.name, normalizeConfig(config, vm), res)
        }, {})
    } else {
        return Object.keys(options).reduce(function (res, key) {
            return set(
                key,
                normalizeConfig(set('name', key, options[key]), vm),
                res
            )
        }, {})
    }
}
