import { supabase } from './supabase';

// Types for edge function responses
export interface FileEntry {
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir';
  size: number;
}

export interface DeckEntry {
  name: string;
  path: string;
}

export interface CommitResult {
  sha: string;
  commit_sha: string;
}

export interface FileContent {
  content: string;
  sha: string;
  name: string;
  path: string;
}

// Private helper to invoke deck-commit edge function
async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('deck-commit', { body });
  if (error) throw new Error(error.message || 'Edge function error');
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Commit (create or update) a markdown file in the user's deck directory */
export async function commitFile(
  path: string,
  content: string,
  sha?: string,
  message?: string,
): Promise<CommitResult> {
  const data = await invoke<{ sha: string; commit_sha: string }>({
    action: 'commit_file', path, content, sha, message,
  });
  return { sha: data.sha, commit_sha: data.commit_sha };
}

/** Delete a file from the user's deck directory */
export async function deleteFile(path: string, sha: string): Promise<void> {
  await invoke<{ success: true }>({ action: 'delete_file', path, sha });
}

/** Get a file's content and metadata from the user's deck directory */
export async function getFile(path: string): Promise<FileContent> {
  const data = await invoke<{ content: string; sha: string; name: string; path: string }>({
    action: 'get_file', path,
  });
  return { content: data.content, sha: data.sha, name: data.name, path: data.path };
}

/** List files in a directory within the user's deck directory */
export async function listFiles(path: string): Promise<FileEntry[]> {
  const data = await invoke<{ files: FileEntry[] }>({ action: 'list_files', path });
  return data.files;
}

/** List all decks for the authenticated user */
export async function listDecks(): Promise<DeckEntry[]> {
  const data = await invoke<{ decks: DeckEntry[] }>({ action: 'list_decks' });
  return data.decks;
}

/** Create a new deck with the given name */
export async function createDeck(name: string): Promise<DeckEntry> {
  const data = await invoke<{ deck: DeckEntry }>({ action: 'create_deck', name });
  return data.deck;
}

/** Rename an existing deck */
export async function renameDeck(oldName: string, newName: string): Promise<DeckEntry> {
  const data = await invoke<{ deck: DeckEntry }>({ action: 'rename_deck', old_name: oldName, new_name: newName });
  return data.deck;
}

/** Delete a deck and all its contents */
export async function deleteDeck(name: string): Promise<void> {
  await invoke<{ success: true }>({ action: 'delete_deck', name });
}
