const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = require('vue')

module.exports = function render (_ctx, _cache) {
    return (_openBlock(), _createBlock('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 24 24',
        fill: 'none',
        class: 'animate-spin h-5 w-5 text-gray-600',
        'aria-hidden': 'true'
    }, [
        _createVNode('circle', {
            class: 'opacity-10',
            stroke: 'currentColor',
            'stroke-width': '4',
            cx: '12',
            cy: '12',
            r: '10'
        }),
        _createVNode('path', {
            class: 'opacity-75',
            fill: 'currentColor',
            d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
        })
    ]))
}
