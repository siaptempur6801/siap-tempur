import { describe, expect, it, vi } from 'vitest'
import { AnswerSaveQueue } from '@/lib/answer-save-queue'
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => {resolve=r}); return {promise,resolve} }
describe('answer save queue', () => {
    it('does not resend successful answers when finishing', async () => {
        const queue=new AnswerSaveQueue<string>(),save=vi.fn().mockResolvedValue(undefined)
        queue.set('q','A');await queue.sync('q',save);await queue.sync('q',save)
        expect(save).toHaveBeenCalledExactlyOnceWith('A');expect(queue.keys()).toEqual([])
    })
    it('allows one write per question and coalesces rapid edits to the latest answer', async () => {
        const queue=new AnswerSaveQueue<string>(),gate=deferred()
        const save=vi.fn().mockImplementationOnce(()=>gate.promise).mockResolvedValue(undefined)
        queue.set('q','A');const worker=queue.sync('q',save);await Promise.resolve()
        queue.set('q','B');queue.set('q','C')
        expect(queue.sync('q',save)).toBe(worker);expect(save).toHaveBeenCalledTimes(1)
        gate.resolve();await worker
        expect(save.mock.calls).toEqual([['A'],['C']]);expect(queue.keys()).toEqual([])
    })
    it('retains failures and rejects a flush until the latest answer is persisted', async () => {
        const queue=new AnswerSaveQueue<string>(),save=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(undefined)
        queue.set('q','A');await expect(queue.sync('q',save)).rejects.toThrow('offline')
        expect(queue.keys()).toEqual(['q']);await queue.sync('q',save)
        expect(save).toHaveBeenCalledTimes(2);expect(queue.keys()).toEqual([])
    })
    it('saves a new edit even if a superseded answer fails', async () => {
        const queue=new AnswerSaveQueue<string>(),gate=deferred()
        const save=vi.fn().mockImplementationOnce(async()=>{await gate.promise;throw Error('old failure')}).mockResolvedValue(undefined)
        queue.set('q','A');const worker=queue.sync('q',save);await Promise.resolve();queue.set('q','B');gate.resolve()
        await expect(worker).resolves.toBeUndefined();expect(save.mock.calls).toEqual([['A'],['B']])
    })
    it('clears a synchronously failed worker so a reconnect can retry', async () => {
        const queue=new AnswerSaveQueue<string>();queue.set('q','A')
        await expect(queue.sync('q',()=>{throw Error('offline')})).rejects.toThrow('offline')
        await expect(queue.sync('q',async()=>undefined)).resolves.toBeUndefined()
    })
    it('keeps simultaneous questions independent and includes flag-only and empty multi-selection edits', async () => {
        const queue=new AnswerSaveQueue<{ids:string[];flag:boolean}>(),gate=deferred(),save=vi.fn().mockResolvedValue(undefined)
        queue.set('q1',{ids:['A'],flag:false});const worker=queue.sync('q1',()=>gate.promise)
        queue.set('q2',{ids:[],flag:true});await queue.sync('q2',save)
        expect(queue.keys()).toEqual(['q1']);expect(save).toHaveBeenCalledWith({ids:[],flag:true})
        gate.resolve();await worker
    })
})

describe('submission save barrier', () => {
    it('rejects manual completion after all pending writes settle', async () => {
        const {flushAnswerSaves}=await import('@/lib/answer-save-queue')
        const gate=deferred();let settled=false
        const flush=flushAnswerSaves([Promise.reject(Error('offline')),gate.promise]).finally(()=>{settled=true})
        const assertion=expect(flush).rejects.toThrow('offline')
        await Promise.resolve();expect(settled).toBe(false);gate.resolve();await assertion
    })
    it('preserves automatic expiry completion when the server rejects late saves', async () => {
        const {flushAnswerSaves}=await import('@/lib/answer-save-queue')
        await expect(flushAnswerSaves([Promise.reject(Error('expired'))],true)).resolves.toBeUndefined()
    })
})
