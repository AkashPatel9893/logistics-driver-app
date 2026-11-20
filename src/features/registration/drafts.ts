import { Directory, File, Paths } from 'expo-file-system';
import { useState } from 'react';

import { kvStorage, storage } from '@/lib/storage';

/**
 * Registration step data kept on the phone, in two layers per key:
 *
 * - `draft:`     what the driver is filling in now, so closing the app mid-step loses nothing.
 * - `submitted:` what was last submitted from this phone. The backend can't send document photos
 *                back (only status, masked number and expiry), so this copy is what lets a step
 *                show what was sent, to look at or update.
 *
 * A screen shows the draft if there is one, otherwise the submitted copy. A successful submit
 * turns the draft into the submitted copy; log out deletes both. Typed fields live in MMKV;
 * photos are copied out of the camera's cache (which the OS may clear) into the documents folder.
 */
const DRAFT = 'draft:';
const SUBMITTED = 'submitted:';

function draftDir(): Directory {
  const dir = new Directory(Paths.document, 'registration-drafts');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

function fileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

function deleteFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone.
  }
}

/** Last submitted value for a key (text or photo URI), if any. */
export function readSubmitted(key: string): string | null {
  return kvStorage.getString(SUBMITTED + key);
}

/**
 * Text field that survives the app being closed, starting from the draft, else what was last
 * submitted, else `initial`. Without a key it is plain state.
 */
export function useDraftText(key: string | undefined, initial = '') {
  const [value, setValue] = useState(() =>
    key
      ? (kvStorage.getString(DRAFT + key) ?? kvStorage.getString(SUBMITTED + key) ?? initial)
      : initial,
  );
  const set = (next: string) => {
    setValue(next);
    if (!key) return;
    // Always store, even empty, so clearing a submitted value isn't undone on reopen.
    kvStorage.setString(DRAFT + key, next);
  };
  return [value, set] as const;
}

/** Photo for a key: the draft one, else the last submitted one, if its file is still there. */
export function readDraftPhoto(key: string): string | null {
  for (const uri of [kvStorage.getString(DRAFT + key), kvStorage.getString(SUBMITTED + key)]) {
    if (uri && fileExists(uri)) return uri;
  }
  return null;
}

/** Copies a camera photo into the drafts folder and remembers it; returns the kept URI. */
export async function saveDraftPhoto(key: string, sourceUri: string): Promise<string> {
  try {
    const previous = kvStorage.getString(DRAFT + key);
    const target = new File(draftDir(), `${key.replace(/[^a-z0-9.-]/gi, '_')}-${Date.now()}.jpg`);
    await new File(sourceUri).copy(target);
    kvStorage.setString(DRAFT + key, target.uri);
    // Never delete the submitted copy here: the driver may still back out of the update.
    if (previous && previous !== kvStorage.getString(SUBMITTED + key)) deleteFile(previous);
    return target.uri;
  } catch {
    // Couldn't keep a copy: the photo still works for this session.
    return sourceUri;
  }
}

/** True when the driver changed something in this step since it was last submitted. */
export function hasDraft(prefix: string): boolean {
  return storage.getAllKeys().some((key) => key.startsWith(DRAFT + prefix));
}

/**
 * After a successful submit: the step's draft becomes its submitted copy (replacing the old one),
 * so reopening the step shows what was sent.
 */
export function markSubmitted(prefix: string) {
  for (const key of storage.getAllKeys()) {
    if (!key.startsWith(DRAFT + prefix)) continue;
    const name = key.slice(DRAFT.length);
    const value = kvStorage.getString(key);
    const old = kvStorage.getString(SUBMITTED + name);
    if (old && old !== value && old.startsWith('file:')) deleteFile(old);
    if (value) kvStorage.setString(SUBMITTED + name, value);
    else kvStorage.delete(SUBMITTED + name);
    kvStorage.delete(key);
  }
}

/**
 * Deletes drafts and submitted copies whose key starts with `prefix` (everything for ''), files
 * included. Used on log out.
 */
export function clearDrafts(prefix: string) {
  for (const key of storage.getAllKeys()) {
    if (!key.startsWith(DRAFT + prefix) && !key.startsWith(SUBMITTED + prefix)) continue;
    const value = kvStorage.getString(key);
    if (value?.startsWith('file:')) deleteFile(value);
    kvStorage.delete(key);
  }
}
