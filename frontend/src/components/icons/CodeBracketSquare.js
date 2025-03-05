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
                    d: 'M11.9091 8.36364L13.8182 10L11.9091 11.6364M8.09091 11.6364L6.18182 10L8.09091 8.36364M4.90909 16H15.0909C15.5972 16 16.0828 15.8276 16.4408 15.5207C16.7989 15.2138 17 14.7976 17 14.3636V5.63636C17 5.20237 16.7989 4.78616 16.4408 4.47928C16.0828 4.1724 15.5972 4 15.0909 4H4.90909C4.40277 4 3.91718 4.1724 3.55916 4.47928C3.20114 4.78616 3 5.20237 3 5.63636V14.3636C3 14.7976 3.20114 15.2138 3.55916 15.5207C3.91718 15.8276 4.40277 16 4.90909 16Z',
                    stroke: 'black',
                    'stroke-width': '1.2',
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round'
                })
            ]
        )
    )
}
