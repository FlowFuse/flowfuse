import { describe, expect, it } from 'vitest'

import { getFeedbackMessageUuids, serializeConversation } from '../../../../frontend/src/composables/Components/expert/turnFeedback.js'

const ai = (_uuid, extra = {}) => ({ _type: 'ai', _uuid, _transactionId: `tx-${_uuid}`, answer: [{ kind: 'chat', content: _uuid }], ...extra })
const human = (_uuid) => ({ _type: 'human', _uuid, content: _uuid })

describe('getFeedbackMessageUuids', () => {
    it('picks the last AI message before each human message and at the end', () => {
        const messages = [human('h1'), ai('a1'), ai('a2'), human('h2'), ai('a3')]
        expect([...getFeedbackMessageUuids(messages)]).toEqual(['a2', 'a3'])
    })

    it('ignores events and system messages between the answers and the next human message', () => {
        const messages = [human('h1'), ai('a1'), { _type: 'event', _uuid: 'e1' }, { _type: 'system', _uuid: 's1' }, human('h2')]
        expect([...getFeedbackMessageUuids(messages)]).toEqual(['a1'])
    })

    it('skips a turn closed by a message without a transaction id', () => {
        const messages = [human('h1'), ai('a1', { _transactionId: undefined })]
        expect(getFeedbackMessageUuids(messages).size).toBe(0)
    })

    it('rates every kind of answer, errors included', () => {
        const messages = [
            human('h1'), ai('a1', { answer: [{ kind: 'questions', questions: [] }] }),
            human('h2'), ai('a2', { answer: [{ kind: 'plan', content: 'p' }] }),
            human('h3'), ai('a3', { answer: [{ kind: 'tool-approval', id: 't' }] }),
            human('h4'), ai('a4', { error: true }),
            human('h5'), ai('a5', { generated: true })
        ]
        expect([...getFeedbackMessageUuids(messages)]).toEqual(['a1', 'a2', 'a3', 'a4', 'a5'])
    })

    it('keeps the row on a voted message when the turn carries on', () => {
        const messages = [human('h1'), ai('a1', { _vote: 'up', answer: [{ kind: 'tool-approval', id: 't' }] }), ai('a2')]
        expect([...getFeedbackMessageUuids(messages)]).toEqual(['a1', 'a2'])
    })

    it('skips a message holding only activity, as left by a turn that never finished', () => {
        const messages = [human('h1'), ai('a1', { answer: [{ kind: 'reasoning', content: 'Composing structured content' }] })]
        expect(getFeedbackMessageUuids(messages).size).toBe(0)
    })

    it('skips a turn that is still open', () => {
        const messages = [human('h1'), ai('a1'), human('h2'), ai('a2')]
        const uuids = getFeedbackMessageUuids(messages, { isOpen: m => m._transactionId === 'tx-a2' })
        expect([...uuids]).toEqual(['a1'])
    })
})

describe('serializeConversation', () => {
    it('serializes each role up to and including the voted message', () => {
        const messages = [
            { _type: 'human', _uuid: 'h1', content: 'Build a flow', _timestamp: 1000 },
            {
                _type: 'ai',
                _uuid: 'a1',
                _timestamp: 2000,
                _streamed: true,
                _transactionId: 'tx-1',
                answer: [
                    { kind: 'reasoning', text: 'Thinking', _uuid: 'x', seq: 1 },
                    { kind: 'mcp_tool', toolName: 'add_nodes', input: '{"nodes":[1]}', output: { ok: true }, _uuid: 'y', _streamed: true },
                    { kind: 'chat', content: 'Done', _uuid: 'z' }
                ]
            },
            { _type: 'system', _uuid: 's1', message: 'Reconnected', _timestamp: 2500 },
            { _type: 'event', _uuid: 'e1', kind: 'instance-ready', payload: { kind: 'instance-ready', name: 'i1' }, _timestamp: 2600 },
            { _type: 'human', _uuid: 'h2', content: 'Later', _timestamp: 3000 },
            { _type: 'ai', _uuid: 'a2', answer: [], _timestamp: 4000 }
        ]

        expect(serializeConversation(messages, 'e1')).toEqual([
            { role: 'user', timestamp: new Date(1000).toISOString(), content: 'Build a flow' },
            {
                role: 'assistant',
                timestamp: new Date(2000).toISOString(),
                content: 'Done',
                items: [
                    { kind: 'reasoning', text: 'Thinking' },
                    { kind: 'mcp_tool', toolName: 'add_nodes', input: { nodes: [1] }, output: { ok: true } }
                ]
            },
            { role: 'system', timestamp: new Date(2500).toISOString(), content: 'Reconnected' },
            { role: 'event', timestamp: new Date(2600).toISOString(), content: 'instance-ready', items: [{ kind: 'instance-ready', name: 'i1' }] }
        ])
    })

    it('joins chat and plan text and leaves out the UI-only fields', () => {
        const messages = [{
            _type: 'ai',
            _uuid: 'a1',
            _timestamp: 1,
            answer: [
                { kind: 'plan', content: 'Step one', _uuid: 'p' },
                { content: 'Hello', _uuid: 'c', _live: true }
            ]
        }]
        const [entry] = serializeConversation(messages, 'a1')
        expect(entry.content).toBe('Step one\n\nHello')
        expect(entry).not.toHaveProperty('items')
    })
})
