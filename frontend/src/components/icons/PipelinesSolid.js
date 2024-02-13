const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = require('vue')

module.exports = function render (_ctx, _cache) {
    const rect = _createVNode('rect', {
        width: 24,
        height: 24,
        x: 0,
        y: 0,
        fill: 'currentFill',
        rx: '4'
    })

    const path1 = _createVNode('path', {
        d: 'M7,15.8 M7,3.1 M7,15.8V4.2C7,3.5,6.5,3,5.8,3H3.9C3.2,3,2.6,3.5,2.6,4.2v11.6'
    })
    const path2 = _createVNode('path', {
        d: 'M14,15.8 M14,3.1 M14,15.8V4.2C14,3.5,13.5,3,12.8,3h-1.9c-0.7,0-1.2,0.5-1.2,1.2v11.6'
    })
    const path3 = _createVNode('path', {
        d: 'M21,3.1 M21,15c0-2.7,0-10.8,0-10.8C21,3.5,20.5,3,19.8,3h-1.9c-0.7,0-1.2,0.5-1.2,1.2V11'
    })
    const path4 = _createVNode('path', {
        d: 'M17.2,22.5c-0.2,0-0.4-0.1-0.5-0.2c-0.3-0.3-0.3-0.8,0-1.1l2.5-2.5H3c-0.4,0-0.8-0.3-0.8-0.8s0.3-0.8,0.8-0.8h16.2l-2.5-2.5c-0.3-0.3-0.3-0.8,0-1.1s0.8-0.3,1.1,0l3.8,3.8c0.1,0.1,0.1,0.2,0.2,0.2c0,0.1,0.1,0.2,0.1,0.3s0,0.2-0.1,0.3c0,0.1-0.1,0.2-0.2,0.2l-3.8,3.8C17.6,22.4,17.4,22.5,17.2,22.5z'
    })
    const path5 = _createVNode('path', {
        d: 'M8,14.8'
    })
    const path6 = _createVNode('path', {
        d: 'M22,14.9'
    })
    const path7 = _createVNode('path', {
        d: 'M15,14.9'
    })

    const group = _createVNode('g', { style: 'fill:#FFFFFF;', transform: 'scale(0.85)translate(2.5,2.5)' }, [path1, path2, path3, path4, path5, path6, path7])

    return (_openBlock(), _createBlock('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 24 24',
        fill: 'currentColor',
        'aria-hidden': 'true'
    }, [
        rect,
        group
    ]))
}
