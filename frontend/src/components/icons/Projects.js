const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = require('vue')

module.exports = function render (_ctx, _cache) {
    return (_openBlock(), _createBlock('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 20 20',
        fill: 'currentColor',
        'aria-hidden': 'true'
    }, [
        _createVNode('path', {
            d: 'M0,7.31v-1.72c5.09,0,5.81-.94,6.44-1.77,.72-.94,1.46-1.67,3.88-1.67v1.72c-1.76,0-2.04,.37-2.51,.99-1.02,1.34-2.31,2.45-7.81,2.45Z'
        }),
        _createVNode('path', {
            d: 'M8.6,12.47c-2.9,0-3.47-1.58-3.88-2.73-.47-1.31-.87-2.43-4.72-2.43v-1.72c4.67,0,5.67,1.69,6.34,3.57,.38,1.06,.57,1.59,2.26,1.59v1.72Z'
        }),
        _createVNode('path', {
            d: 'M16.78,14.62h-6.88c-.95,0-1.72-.77-1.72-1.72v-2.58c0-.95,.77-1.72,1.72-1.72h6.88c.95,0,1.72,.77,1.72,1.72v2.58c0,.95-.77,1.72-1.72,1.72Zm0-1.72v0h0Zm0-2.58h-6.88v2.58h6.88v-2.58Z'
        }),
        _createVNode('path', {
            d: 'M18.28,6.02h-6.88c-.95,0-1.72-.77-1.72-1.72V1.72c0-.95,.77-1.72,1.72-1.72h6.88c.95,0,1.72,.77,1.72,1.72v2.58c0,.95-.77,1.72-1.72,1.72Zm0-1.72v0h0Zm0-2.58h-6.88v2.58h6.88V1.72Z'
        })
    ]))
}
