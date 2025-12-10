const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = require('vue')

module.exports = function render (_ctx, _cache) {
    const path1 = _createVNode('path', {
        d: 'M10.1667 23.5L21.8333 23.5C22.7538 23.5 23.5 22.7538 23.5 21.8333L23.5 10.1667C23.5 9.24619 22.7538 8.5 21.8333 8.5L10.1667 8.5C9.24619 8.5 8.5 9.24619 8.5 10.1667L8.5 21.8333C8.5 22.7538 9.24619 23.5 10.1667 23.5Z',
        stroke: 'black',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
    })

    const path2 = _createVNode('path', {
        d: 'M18.5 23.5L18.5 8.5',
        stroke: 'black',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
    })

    const path3 = _createVNode('path', {
        d: 'M12.6667 13.5L15.1667 16L12.6667 18.5',
        stroke: 'black',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
    })

    return (_openBlock(), _createBlock('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        width: 32,
        height: 32,
        viewBox: '0 0 32 32',
        fill: 'none',
        'aria-hidden': 'true'
    }, [
        path1,
        path2,
        path3
    ]))
}
