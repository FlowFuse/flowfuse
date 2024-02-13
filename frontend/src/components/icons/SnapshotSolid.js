const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = require('vue')

module.exports = function render (_ctx, _cache) {
    const rect = _createVNode('rect', {
        width: 24,
        height: 24,
        fill: 'currentFill',
        rx: '4'
    })

    return (_openBlock(), _createBlock('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 24 24',
        fill: 'currentColor',
        'aria-hidden': 'true'
    }, [
        rect,
        _createVNode('path', {
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'stroke-width': '2',
            style: 'stroke: #ffffff',
            d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            transform: 'scale(0.85)translate(2.5,2.5)'
        })
    ]))
}
