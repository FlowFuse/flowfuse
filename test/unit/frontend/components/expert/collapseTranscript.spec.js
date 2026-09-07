import { describe, expect, test } from 'vitest'

import { buildCollapsedTranscript } from '../../../../../frontend/src/components/expert/composables/collapseTranscript.js'

function aiMessage (uuid, answer) {
    return { _uuid: uuid, _type: 'ai', answer }
}

function humanMessage (uuid, content) {
    return { _uuid: uuid, _type: 'human', content }
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
})
