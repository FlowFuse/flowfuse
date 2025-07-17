const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = require('vue')

module.exports = function render (_ctx, _cache) {
    return (
        _openBlock(),
        _createBlock(
            'svg',
            {
                width: 20,
                height: 20,
                viewBox: '0 0 20 20',
                fill: 'none',
                xmlns: 'http://www.w3.org/2000/svg'
            },
            [
                _createVNode('path', {
                    d: 'M15.8333 2.5H4.16667C3.24619 2.5 2.5 3.24619 2.5 4.16667V15.8333C2.5 16.7538 3.24619 17.5 4.16667 17.5H15.8333C16.7538 17.5 17.5 16.7538 17.5 15.8333V4.16667C17.5 3.24619 16.7538 2.5 15.8333 2.5Z',
                    stroke: 'black',
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round'
                }),
                _createVNode('path', {
                    d: 'M7.5 2.5V17.5',
                    stroke: 'black',
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round'
                }),
                _createVNode('path', {
                    d: 'M13.3333 12.5L10.8333 10L13.3333 7.5',
                    stroke: 'black',
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round'
                })
            ]
        )
    )
}
