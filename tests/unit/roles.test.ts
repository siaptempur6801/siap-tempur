import { describe, expect, it } from 'vitest'
import {
    canAccessArticleAdmin,
    canPublishArticle,
    isAdminRole,
    isArticleWriterRole,
} from '../../lib/utils/roles'

describe('role permissions', () => {
    it('keeps article_writer out of tryout admin permissions', () => {
        expect(isArticleWriterRole('article_writer')).toBe(true)
        expect(isAdminRole('article_writer')).toBe(false)
    })

    it('allows article_writer to access article admin only', () => {
        expect(canAccessArticleAdmin('article_writer')).toBe(true)
        expect(canPublishArticle('article_writer')).toBe(false)
    })

    it('allows admin and superadmin to publish articles', () => {
        expect(canPublishArticle('admin')).toBe(true)
        expect(canPublishArticle('superadmin')).toBe(true)
    })

    it('does not grant article access to normal users', () => {
        expect(canAccessArticleAdmin('user')).toBe(false)
        expect(canAccessArticleAdmin(null)).toBe(false)
    })
})
