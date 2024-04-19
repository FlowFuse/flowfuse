const blueprint1 = {
    id: 'yJR1DQ9NbK',
    active: true,
    name: 'My first Blueprint',
    description: 'My first team',
    category: 'Basic Blueprint',
    icon: 'cog',
    order: 1,
    default: false,
    createdAt: '2024-04-16T15:14:16.780Z',
    updatedAt: '2024-04-17T08:02:35.066Z'
}
const blueprint2 = {
    id: 'v0J85bLeA5',
    active: true,
    name: 'Other blueprint (blank)',
    description: 'some other description',
    category: 'Some other category',
    icon: 'briefcase',
    order: 0,
    default: true,
    createdAt: '2024-04-17T08:02:35.065Z',
    updatedAt: '2024-04-17T08:02:35.065Z'
}
const blueprint3 = {
    id: 'v0J85bLeA6',
    active: true,
    name: 'Other Additional blueprint (blank)',
    description: 'some other additional description',
    category: 'Some other category',
    icon: 'briefcase',
    order: 0,
    default: false,
    createdAt: '2024-04-17T08:02:35.065Z',
    updatedAt: '2024-04-17T08:02:35.065Z'
}

const libraries = [
    {
        fn: 'First Team Library.json',
        type: 'flows',
        updatedAt: '2024-04-17T08:24:03.762Z'
    }, {
        fn: 'Second Team Library.json',
        type: 'flows',
        updatedAt: '2024-04-17T09:21:38.439Z'
    }, {
        fn: 'Third Team Library.json',
        type: 'flows',
        updatedAt: '2024-04-17T09:22:34.843Z'
    }
]

const sharedLibrary = [{
    id: 'b9b294725f80b01c',
    type: 'inject',
    z: 'dd5a65f78178e921',
    name: 'Flow 1',
    props: [{ p: 'payload' }, {
        p: 'topic',
        vt: 'str'
    }],
    repeat: '3',
    crontab: '',
    once: false,
    onceDelay: 0.1,
    topic: '',
    payload: '',
    payloadType: 'date',
    x: 590,
    y: 420,
    wires: [['d040659cbe69d523', 'e346197ad2873980']]
}, {
    id: 'd040659cbe69d523',
    type: 'debug',
    z: 'dd5a65f78178e921',
    name: 'debug 1',
    active: true,
    tosidebar: true,
    console: true,
    tostatus: false,
    complete: 'payload',
    targetType: 'msg',
    statusVal: '',
    statusType: 'auto',
    x: 970,
    y: 320,
    wires: []
}, {
    id: 'e346197ad2873980',
    type: 'ui-text',
    z: 'dd5a65f78178e921',
    group: '423947de9c2b81cf',
    order: 0,
    width: 0,
    height: 0,
    name: '',
    label: 'text',
    format: '{{msg.payload}}',
    layout: 'row-spread',
    style: false,
    font: '',
    fontSize: 16,
    color: '#717171',
    className: '',
    x: 1030,
    y: 440,
    wires: []
}, {
    id: '423947de9c2b81cf',
    type: 'ui-group',
    name: 'My Group',
    page: '45ee287d460c26db',
    width: 6,
    height: 1,
    order: -1,
    showTitle: true,
    className: '',
    visible: true,
    disabled: false
}, {
    id: '45ee287d460c26db',
    type: 'ui-page',
    name: 'Page N',
    ui: 'b3f4402b1661a42e',
    path: '/pageN',
    icon: 'home',
    layout: 'grid',
    theme: 'd5a42eef34d39d76',
    order: -1,
    className: '',
    visible: 'true',
    disabled: 'false'
}, {
    id: 'b3f4402b1661a42e',
    type: 'ui-base',
    name: 'My Dashboard',
    path: '/dashboard',
    includeClientData: true,
    acceptsClientConfig: ['ui-notification', 'ui-control'],
    showPathInSidebar: false,
    navigationStyle: 'default'
}, {
    id: 'd5a42eef34d39d76',
    type: 'ui-theme',
    name: 'Default Theme',
    colors: {
        surface: '#ffffff',
        primary: '#0094CE',
        bgPage: '#eeeeee',
        groupBg: '#ffffff',
        groupOutline: '#cccccc'
    },
    sizes: {
        pagePadding: '12px',
        groupGap: '12px',
        groupBorderRadius: '4px',
        widgetGap: '12px'
    }
}]

function interceptBlueprints (blueprints = []) {
    cy.intercept('/api/*/flow-blueprints?*', {
        meta: {},
        count: 2,
        blueprints
    }).as('getBlueprints')
    cy.visit('team/ateam/library')
}

function interceptLibraries (libraries = []) {
    cy.intercept('/storage/library/*', [...libraries]).as('getLibraries')
    cy.visit('team/ateam/library')
}

describe('FlowForge - Library', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    describe('Blueprints tab', () => {
        it('allows users to create new Blueprints if they don\'t have  any', () => {
            interceptBlueprints()

            cy.wait(['@getBlueprints'])

            cy.get('div[data-el="page-name"]').contains('Library')
            cy.contains('Shared repository to store common flows and nodes.')

            cy.contains('Create your own Blueprints')
            cy.contains('Your Blueprints will be shown here, and will be available within all of your Node-RED instances on FlowFuse.')

            cy.get('button').contains('Go To Blueprints').click()

            cy.window().then((win) => expect(win.location.href).to.contain('admin/flow-blueprints'))

            cy.get('button').contains('Create Flow Blueprint')
            cy.contains('Flow Blueprints')
            cy.contains('Inactive Blueprints')
        })

        it('groups multiple blueprints by their category', () => {
            interceptBlueprints([blueprint1, blueprint2, blueprint3])

            cy.get('div[data-el="page-name"]').contains('Library')

            cy.contains('Some other category')
            cy.contains('Other blueprint (blank)')
            cy.contains('some other description')
            cy.contains('Other Additional blueprint (blank)')
            cy.contains('some other additional description')

            cy.contains('Basic Blueprint')
            cy.contains('My first Blueprint')
            cy.contains('My first team')
        })

        it('allows you to select a predefined blueprint and create an instance', () => {
            interceptBlueprints([blueprint1, blueprint2, blueprint3])

            cy.get('div[data-el="yJR1DQ9NbK"]').contains('Select').click()

            cy.window().then((win) => expect(win.location.href).to.contain('instances/create'))

            cy.contains('Create Instance')
            cy.contains('My first Blueprint')
        })
    })

    describe('Team Library tab', () => {
        it('allows users to inspect existing Team Libraries ', () => {
            interceptLibraries([])

            cy.get('.ff-tab-option').contains('Team Library').click()

            cy.wait(['@getLibraries'])

            cy.contains('Create your own Team Library')
            cy.contains('You can import and export flows and functions to a shared Team Library from within your Node-RED Instances.')
            cy.contains('The contents of your Team Library will show here, and will be available within all of your Node-RED instances on FlowFuse.')
            cy.get('button').contains('Go To Instance').as('createInstanceBtn').should('exist')
            cy.contains('You can see a video of how to get started with this feature here.')

            cy.get('@createInstanceBtn').click()
            cy.window().then((win) => expect(win.location.href).to.contain('/instances'))
        })

        it('allows users to create Team Libraries if they don\'t have any', () => {
            interceptLibraries(libraries)

            cy.get('.ff-tab-option').contains('Team Library').click()

            cy.wait(['@getLibraries'])

            cy.intercept('/storage/library/*/*', sharedLibrary).as('getLibrary')

            cy.get('td').contains('First Team Library.json').click()

            cy.wait(['@getLibrary'])

            cy.contains('Copy to Clipboard')
            cy.get('pre.ff-code-previewer').should('exist')
            cy.contains('"id": "b9b294725f80b01c"')
            cy.contains('"id": "d040659cbe69d523"')
            cy.contains('"id": "e346197ad2873980"')
            cy.contains('"id": "423947de9c2b81cf"')
            cy.contains('"id": "45ee287d460c26db"')
            cy.contains('"id": "b3f4402b1661a42e"')
            cy.contains('"id": "d5a42eef34d39d76"')
        })
    })
})
