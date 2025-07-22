const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = require('vue')

module.exports = function render (_ctx, _cache) {
    const path1 = _createVNode('path', {
        d: 'M3.125 10H16.875 M3.125 13.125H16.875 M3.125 16.25H16.875 M4.6875 3.75H15.3125C15.7269 3.75 16.1243 3.91462 16.4174 4.20765C16.7104 4.50067 16.875 4.8981 16.875 5.3125C16.875 5.7269 16.7104 6.12433 16.4174 6.41735C16.1243 6.71038 15.7269 6.875 15.3125 6.875H4.6875C4.2731 6.875 3.87567 6.71038 3.58265 6.41735C3.28962 6.12433 3.125 5.7269 3.125 5.3125C3.125 4.8981 3.28962 4.50067 3.58265 4.20765C3.87567 3.91462 4.2731 3.75 4.6875 3.75Z',
        stroke: 'black',
        'stroke-width': '1.5',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
    })

    return (_openBlock(), _createBlock('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 20 20',
        fill: 'none',
        'aria-hidden': 'true'
    }, [path1]))
}
