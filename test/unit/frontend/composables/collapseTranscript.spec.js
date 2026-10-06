import { describe, expect, test } from 'vitest'

import { annotateTurns, buildCollapsedTranscript } from '../../../../frontend/src/composables/Components/expert/collapseTranscript.js'

function aiMessage (uuid, answer) {
    return { _uuid: uuid, _type: 'ai', answer }
}

function humanMessage (uuid, content) {
    return { _uuid: uuid, _type: 'human', content }
}

function eventMessage (uuid, kind) {
    return { _uuid: uuid, _type: 'event', kind, payload: { kind } }
}

function questionsAnswer (questions) {
    return { kind: 'questions', questions }
}

describe('buildCollapsedTranscript', () => {
    test('passes plain messages through untouched', () => {
        const messages = [
            humanMessage('h1', 'hello'),
            aiMessage('a1', [{ kind: 'chat', content: 'hi there' }])
        ]
        const result = buildCollapsedTranscript(messages)
        expect(result).toEqual([
            { kind: 'message', message: messages[0] },
            { kind: 'message', message: messages[1] }
        ])
    })

    test('folds an answered questions turn and absorbs the reply', () => {
        const questions = [
            { question: 'Where is your data coming from?', options: [] },
            { question: 'What do you want to see at the end?', options: [] }
        ]
        const messages = [
            aiMessage('a1', [questionsAnswer(questions)]),
            humanMessage('h1', 'Where is your data coming from? Sensors\nWhat do you want to see at the end? A dashboard'),
            aiMessage('a2', [{ kind: 'chat', content: 'great' }])
        ]
        const result = buildCollapsedTranscript(messages)
        expect(result.length).toBe(2)
        expect(result[0].kind).toBe('folded-turn')
        expect(result[0].questionsMessage).toBe(messages[0])
        expect(result[0].replyMessage).toBe(messages[1])
        expect(result[0].entries).toEqual([
            { question: 'Where is your data coming from?', answer: 'Sensors' },
            { question: 'What do you want to see at the end?', answer: 'A dashboard' }
        ])
        expect(result[1]).toEqual({ kind: 'message', message: messages[2] })
    })

    test('does not fold the latest questions message', () => {
        const messages = [
            humanMessage('h1', 'hello'),
            aiMessage('a1', [questionsAnswer([{ question: 'Q?', options: [] }])])
        ]
        const result = buildCollapsedTranscript(messages)
        expect(result).toEqual([
            { kind: 'message', message: messages[0] },
            { kind: 'message', message: messages[1] }
        ])
    })

    test('folds an unanswered stale questions message without absorbing anything', () => {
        const messages = [
            aiMessage('a1', [questionsAnswer([{ question: 'Q?', options: [] }])]),
            aiMessage('a2', [{ kind: 'chat', content: 'moving on' }])
        ]
        const result = buildCollapsedTranscript(messages)
        expect(result.length).toBe(2)
        expect(result[0].kind).toBe('folded-turn')
        expect(result[0].replyMessage).toBe(null)
        expect(result[0].entries).toEqual([{ question: 'Q?', answer: null }])
        expect(result[1]).toEqual({ kind: 'message', message: messages[1] })
    })

    test('keeps the raw reply when answers cannot be matched to questions', () => {
        const messages = [
            aiMessage('a1', [questionsAnswer([{ question: 'Q?', options: [] }])]),
            humanMessage('h1', 'a free-form answer typed by hand'),
            aiMessage('a2', [{ kind: 'chat', content: 'ok' }])
        ]
        const result = buildCollapsedTranscript(messages)
        expect(result[0].kind).toBe('folded-turn')
        expect(result[0].entries).toEqual([{ question: 'Q?', answer: null }])
        expect(result[0].replyMessage).toBe(messages[1])
    })

    test('never folds non-questions ai messages', () => {
        const messages = [
            aiMessage('a1', [{ kind: 'chat', content: 'welcome' }]),
            humanMessage('h1', 'hello'),
            aiMessage('a2', [{ kind: 'chat', content: 'hi' }])
        ]
        const result = buildCollapsedTranscript(messages)
        expect(result.every(entry => entry.kind === 'message')).toBe(true)
    })

    test('passes an event message through untouched, even right after a questions turn', () => {
        const messages = [
            aiMessage('a1', [questionsAnswer([{ question: 'Q?', options: [] }])]),
            eventMessage('e1', 'instance-ready'),
            aiMessage('a2', [{ kind: 'chat', content: 'moving on' }])
        ]
        const result = buildCollapsedTranscript(messages)
        expect(result.length).toBe(3)
        expect(result[0].kind).toBe('folded-turn')
        expect(result[0].replyMessage).toBe(null)
        expect(result[1]).toEqual({ kind: 'message', message: messages[1] })
        expect(result[2]).toEqual({ kind: 'message', message: messages[2] })
    })
})

describe('annotateTurns', () => {
    const chat = content => [{ kind: 'chat', content }]
    const classesOf = messages => annotateTurns(buildCollapsedTranscript(messages)).map(entry => entry.classes)

    test('marks the open question set and an Expert turn that starts after a folded turn', () => {
        const messages = [
            aiMessage('a1', [questionsAnswer([{ question: 'Q1?', options: [] }])]),
            humanMessage('h1', 'Q1? A'),
            aiMessage('a2', [questionsAnswer([{ question: 'Q2?', options: [] }])])
        ]
        // the first turn folds with its reply; the open question set is last
        expect(classesOf(messages)).toEqual([['answered'], ['turn-start', 'has-questions']])
    })

    test('marks an Expert message answered by a typed reply, and the next Expert turn as a turn start', () => {
        const messages = [
            aiMessage('a1', chat('What are you building today?')),
            humanMessage('h1', 'A live screen'),
            aiMessage('a2', chat('Got it'))
        ]
        expect(classesOf(messages)).toEqual([['answered'], [], ['turn-start']])
    })

    test('looks past an event card between the Expert\'s text and the reply', () => {
        const messages = [
            aiMessage('a1', chat('Setting up your workspace')),
            eventMessage('e1', 'instance-ready'),
            humanMessage('h1', 'great'),
            eventMessage('e2', 'instance-ready'),
            aiMessage('a2', chat('Next step'))
        ]
        expect(classesOf(messages)).toEqual([['answered'], [], [], [], ['turn-start']])
    })

    test('never starts a turn on a person\'s message, such as a second one after Stop', () => {
        const messages = [
            aiMessage('a1', chat('Working on it')),
            humanMessage('h1', 'stop'),
            humanMessage('h2', 'try again with MQTT')
        ]
        expect(classesOf(messages)).toEqual([['answered'], [], []])
    })

    test('a folded turn without a reply is not answered but still ends the turn', () => {
        const messages = [
            aiMessage('a1', [questionsAnswer([{ question: 'Q?', options: [] }])]),
            aiMessage('a2', chat('moving on'))
        ]
        expect(classesOf(messages)).toEqual([[], ['turn-start']])
    })

    test('keeps every entry and its fields, adding only the classes', () => {
        const messages = [aiMessage('a1', chat('hello')), humanMessage('h1', 'hi')]
        const entries = buildCollapsedTranscript(messages)
        const annotated = annotateTurns(entries)
        expect(annotated.map(({ classes, ...entry }) => entry)).toEqual(entries)
    })
})
