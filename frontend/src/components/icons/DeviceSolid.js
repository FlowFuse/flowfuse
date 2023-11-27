const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = require('vue')

module.exports = function render (_ctx, _cache) {
    const path1 = _createVNode('rect', {
        width: 24,
        height: 24,
        fill: 'currentFill',
        rx: '4'
    })

    const path2 = _createVNode('path', {
        style: 'fill: #FFFFFF;',
        d: 'M15 9H9v6h6V9Z'
    })

    const path3 = _createVNode('path', {
        style: 'fill:#FFFFFF;',
        'fill-rule': 'evenodd',
        d: 'M9 4a1 1 0 0 1 2 0v1h2V4a1 1 0 0 1 2 0v1h2a2 2 0 0 1 2 2v2h1a1 1 0 1 1 0 2h-1v2h1a1 1 0 0 1 0 2h-1v2a2 2 0 0 1-2 2h-2v1a1 1 0 0 1-2 0v-1h-2v1a1 1 0 0 1-2 0v-1H7a2 2 0 0 1-2-2v-2H4a1 1 0 0 1 0-2h1v-2H4a1 1 0 0 1 0-2h1V7a2 2 0 0 1 2-2h2V4ZM7 7h10v10H7V7Z'
    })

    return (_openBlock(), _createBlock('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 24 24',
        fill: 'currentColor',
        'aria-hidden': 'true'
    }, [
        path1,
        path2,
        path3
    ]))
}
