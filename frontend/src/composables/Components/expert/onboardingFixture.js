/**
 * TEMPORARY: a hardcoded onboarding conversation so the surface has something
 * to render while the Expert-side work lands. Once flowfuse#8369 teaches the
 * Expert to open the onboarding session itself, delete this file and the
 * seeding call in pages/team/Onboarding.vue.
 *
 * Shapes match what `hydrateMessages` in stores/product-expert.js expects:
 * `{ answer: [...] }` for AI turns, `{ query: '...' }` for the user's.
 */
const ONBOARDING_FIXTURE_MESSAGES = [
    {
        answer: [{
            kind: 'questions',
            questions: [{
                question: 'What do you want working?',
                multiSelect: false,
                options: [
                    { label: 'Readings into a dashboard' },
                    { label: 'Alerts when something breaks' },
                    { label: 'Data into a database' }
                ]
            }]
        }]
    },
    { query: 'What do you want working? Readings into a dashboard' },
    {
        answer: [{
            kind: 'questions',
            questions: [{
                question: 'Where do the readings come from?',
                multiSelect: true,
                options: [
                    { label: 'Allen-Bradley PLC' },
                    { label: 'Siemens PLC' },
                    { label: 'over Ethernet' }
                ]
            }]
        }]
    },
    { query: 'Where do the readings come from? Allen-Bradley PLC, over Ethernet' },
    {
        answer: [{
            kind: 'questions',
            questions: [{
                question: "How should it let you know when something's wrong?",
                multiSelect: true,
                options: [
                    { label: 'Show it on the same screen' },
                    { label: 'Email me' },
                    { label: 'Post to a chat channel', description: 'Slack, Teams and similar' }
                ]
            }]
        }]
    }
]

export { ONBOARDING_FIXTURE_MESSAGES }
