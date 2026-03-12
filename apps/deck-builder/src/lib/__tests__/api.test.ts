import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock fns are available when vi.mock factory runs (hoisted to top)
const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    functions: {
      invoke: mockInvoke,
    },
  }),
}));

// Import after mock setup
import { commitFile, deleteFile, getFile, listFiles, listDecks, createDeck, renameDeck, deleteDeck } from '../api';

describe('api module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('commitFile', () => {
    it('calls supabase.functions.invoke with correct action and body', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, sha: 'abc123', commit_sha: 'def456' },
        error: null,
      });

      await commitFile('user1/deck1/card.md', '# Card', 'old-sha', 'update card');

      expect(mockInvoke).toHaveBeenCalledWith('deck-commit', {
        body: {
          action: 'commit_file',
          path: 'user1/deck1/card.md',
          content: '# Card',
          sha: 'old-sha',
          message: 'update card',
        },
      });
    });

    it('returns sha and commit_sha from successful response', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, sha: 'abc123', commit_sha: 'def456' },
        error: null,
      });

      const result = await commitFile('path.md', 'content');

      expect(result).toEqual({ sha: 'abc123', commit_sha: 'def456' });
    });

    it('throws on error response', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Function error' },
      });

      await expect(commitFile('path.md', 'content')).rejects.toThrow('Function error');
    });

    it('throws on data-level error', async () => {
      mockInvoke.mockResolvedValue({
        data: { error: 'Path validation failed' },
        error: null,
      });

      await expect(commitFile('bad/path', 'content')).rejects.toThrow('Path validation failed');
    });
  });

  describe('deleteFile', () => {
    it('calls invoke with action delete_file, path, and sha', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await deleteFile('user1/deck1/card.md', 'sha123');

      expect(mockInvoke).toHaveBeenCalledWith('deck-commit', {
        body: {
          action: 'delete_file',
          path: 'user1/deck1/card.md',
          sha: 'sha123',
        },
      });
    });

    it('throws on error', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      await expect(deleteFile('path.md', 'sha')).rejects.toThrow('Delete failed');
    });
  });

  describe('getFile', () => {
    it('calls invoke with action get_file and path', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, content: '# Hello', sha: 'abc', name: 'card.md', path: 'user1/deck1/card.md' },
        error: null,
      });

      const result = await getFile('user1/deck1/card.md');

      expect(mockInvoke).toHaveBeenCalledWith('deck-commit', {
        body: {
          action: 'get_file',
          path: 'user1/deck1/card.md',
        },
      });
      expect(result).toEqual({
        content: '# Hello',
        sha: 'abc',
        name: 'card.md',
        path: 'user1/deck1/card.md',
      });
    });

    it('throws on error', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(getFile('missing.md')).rejects.toThrow('Not found');
    });
  });

  describe('listDecks', () => {
    it('calls invoke with action list_decks', async () => {
      const decks = [
        { name: 'math', path: 'user1/math' },
        { name: 'science', path: 'user1/science' },
      ];
      mockInvoke.mockResolvedValue({
        data: { success: true, decks },
        error: null,
      });

      const result = await listDecks();

      expect(mockInvoke).toHaveBeenCalledWith('deck-commit', {
        body: { action: 'list_decks' },
      });
      expect(result).toEqual(decks);
    });

    it('throws on error', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized' },
      });

      await expect(listDecks()).rejects.toThrow('Unauthorized');
    });
  });

  describe('listFiles', () => {
    it('calls invoke with action list_files and path', async () => {
      const files = [
        { name: 'card1.md', path: 'user1/deck1/card1.md', sha: 'a1', type: 'file' as const, size: 100 },
        { name: 'card2.md', path: 'user1/deck1/card2.md', sha: 'a2', type: 'file' as const, size: 200 },
      ];
      mockInvoke.mockResolvedValue({
        data: { success: true, files },
        error: null,
      });

      const result = await listFiles('user1/deck1');

      expect(mockInvoke).toHaveBeenCalledWith('deck-commit', {
        body: {
          action: 'list_files',
          path: 'user1/deck1',
        },
      });
      expect(result).toEqual(files);
    });

    it('throws on error', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Access denied' },
      });

      await expect(listFiles('other-user/deck')).rejects.toThrow('Access denied');
    });
  });

  describe('createDeck', () => {
    it('calls invoke with action create_deck and name', async () => {
      const deck = { name: 'Math 101', path: 'user1/Math 101' };
      mockInvoke.mockResolvedValue({
        data: { success: true, deck },
        error: null,
      });

      const result = await createDeck('Math 101');

      expect(mockInvoke).toHaveBeenCalledWith('deck-commit', {
        body: { action: 'create_deck', name: 'Math 101' },
      });
      expect(result).toEqual(deck);
    });

    it('returns DeckEntry from successful response', async () => {
      const deck = { name: 'Science', path: 'user1/Science' };
      mockInvoke.mockResolvedValue({
        data: { success: true, deck },
        error: null,
      });

      const result = await createDeck('Science');

      expect(result).toEqual({ name: 'Science', path: 'user1/Science' });
    });

    it('throws on error response', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Deck already exists' },
      });

      await expect(createDeck('existing')).rejects.toThrow('Deck already exists');
    });
  });

  describe('renameDeck', () => {
    it('calls invoke with action rename_deck, old_name, and new_name', async () => {
      const deck = { name: 'New Name', path: 'user1/New Name' };
      mockInvoke.mockResolvedValue({
        data: { success: true, deck },
        error: null,
      });

      const result = await renameDeck('old-name', 'New Name');

      expect(mockInvoke).toHaveBeenCalledWith('deck-commit', {
        body: { action: 'rename_deck', old_name: 'old-name', new_name: 'New Name' },
      });
      expect(result).toEqual(deck);
    });

    it('returns DeckEntry from successful response', async () => {
      const deck = { name: 'Renamed', path: 'user1/Renamed' };
      mockInvoke.mockResolvedValue({
        data: { success: true, deck },
        error: null,
      });

      const result = await renameDeck('old', 'Renamed');

      expect(result).toEqual({ name: 'Renamed', path: 'user1/Renamed' });
    });

    it('throws on error response', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Deck not found' },
      });

      await expect(renameDeck('missing', 'new-name')).rejects.toThrow('Deck not found');
    });
  });

  describe('deleteDeck', () => {
    it('calls invoke with action delete_deck and name', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await deleteDeck('deck-name');

      expect(mockInvoke).toHaveBeenCalledWith('deck-commit', {
        body: { action: 'delete_deck', name: 'deck-name' },
      });
    });

    it('resolves on success', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await expect(deleteDeck('deck-name')).resolves.toBeUndefined();
    });

    it('throws on error response', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Deck not found' },
      });

      await expect(deleteDeck('missing')).rejects.toThrow('Deck not found');
    });
  });
});
