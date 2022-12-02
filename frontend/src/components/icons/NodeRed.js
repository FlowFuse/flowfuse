const { createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock } = require('vue')

module.exports = function render (_ctx, _cache) {
    const path1 = _createVNode('path', {
        opacity: 0.98,
        style: 'color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto',
        fill: '#8f0000',
        d: 'M8.7,405.4l8.7,5v10.1l-8.7,5l-8.7-5l0-10.1L8.7,405.4z'
    })

    const path2 = _createVNode('path', {
        style: 'fill: black; fill-rule:evenodd;clip-rule:evenodd;fill-opacity:0.199;',
        d: 'M8.7,424.5L7.8,424L1,416.6l0.1-0.4h3.4l0.6-2l0.5,0.8l1.8-2l1.5-0.4l0.1,1l1,0.1l1,0l2.7,0.1l0.5-2.2l2.3,2.7l-0.1,2l-3.6,0l-0.1,1.9l3.7,0.4l0,1.3L8.7,424.5z'
    })

    const path3 = _createVNode('path', {
        style: 'opacity:0.98;fill:#FFFFFF;enable-background:new',
        d: 'M0.7,416.6v3.4c0,0.1,0,0.1,0.1,0.1l7.9,4.5c0,0,0.1,0,0.2,0l7.9-4.5c0,0,0.1-0.1,0.1-0.1v-1.1v-0.7v-1.6v-0.7v-5c0-0.1,0-0.1-0.1-0.1l-7.9-4.5c0,0,0,0-0.1,0c0,0-0.1,0-0.1,0l-7.9,4.5c0,0-0.1,0.1-0.1,0.1v2.8v0.6v1.6V416.6zM8.7,406.5l7.7,4.5v4.9h-3.1c-0.5,0-1,0.5-1,1v0.1c-1.9,0-2.4-0.5-3.1-1.1c-0.6-0.5-1.3-1.1-2.7-1.3c0.3-0.3,0.4-0.6,0.6-0.8c0.2-0.3,0.3-0.5,0.5-0.7c0.2-0.1,0.5-0.2,0.9-0.2v0.1c0,0.5,0.4,1,1,1h4c0.5,0,1-0.4,1-1v-1c0-0.5-0.5-1-1-1l-4,0c-0.5,0-1,0.4-1,1v0.2c-0.5,0-0.9,0.1-1.2,0.3c-0.4,0.3-0.6,0.6-0.7,0.9c-0.2,0.3-0.3,0.6-0.5,0.7c-0.2,0.2-0.4,0.3-0.8,0.3c0-0.5-0.5-0.9-1-0.9H1V411L8.7,406.5z M9.4,411.8h4c0.2,0,0.3,0.1,0.3,0.3v1c0,0.2-0.1,0.3-0.3,0.3h-4c-0.2,0-0.3-0.1-0.3-0.3v-1C9.1,411.9,9.2,411.8,9.4,411.8L9.4,411.8z M1,414.3h3.2c0.2,0,0.3,0.2,0.3,0.3v1c0,0.2-0.1,0.3-0.3,0.3H1L1,414.3z M5.2,415.2c2.2,0,2.9,0.6,3.6,1.2c0.7,0.6,1.5,1.2,3.6,1.3v0.2c0,0.5,0.5,1,1,1h3.1v1l-7.7,4.5L1,419.9v-3.3h3.2c0.5,0,1-0.4,1-1L5.2,415.2zM13.4,416.6h3.1v1.6h-3.1c-0.2,0-0.3-0.1-0.3-0.3v-1C13,416.7,13.2,416.6,13.4,416.6L13.4,416.6z'
    })

    const group1 = _createVNode('g', {
        transform: 'translate(.000014172 .000022107)'
    }, [path1, path2, path3])

    const wrapper = _createVNode('g', {
        transform: 'translate(2 -405.36)'
    }, [group1])

    return (_openBlock(), _createBlock('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 20 20',
        fill: 'currentColor',
        'aria-hidden': 'true'
    }, [
        wrapper
    ]))
}
