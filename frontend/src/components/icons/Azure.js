const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = require('vue')

module.exports = function render (_ctx, _cache) {
    const path1 = _createVNode('path', {
        d: 'M208.2 120.5a13.6 13.6 0 00-12.9 9.2L113 373.5a13.5 13.5 0 0012.8 17.9H192a13.6 13.6 0 0012.9-9.2l88.3-261.7H208.1Z'
    })

    const path2 = _createVNode('path', {
        d: 'M331.7 296.1H196.8a6.2 6.2 0 00-4.3 10.8l86.7 80.9a13.6 13.6 0 009.3 3.7h76.4z'
    })

    const path3 = _createVNode('path', {
        d: 'M399.1 373.6a13.5 13.5 0 01-12.8 17.9H291.5a13.5 13.5 0 0012.8-17.9L222 129.8a13.5 13.5 0 00-12.8-9.2H304a13.5 13.5 0 0112.8 9.2Z'
    })

    return (_openBlock(), _createBlock('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '90 97 333 318',
        fill: 'currentColor',
        'aria-hidden': 'true'
    }, [
        path1,
        path2,
        path3
    ]))
}
