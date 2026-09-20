import { describe, expect, it } from 'vitest';

import { isEntryCopyTarget } from '../entryCopyStore';

describe('isEntryCopyTarget', () => {
  it('requires both the entry and source rundown to match', () => {
    expect(isEntryCopyTarget('entry-1', 'rundown-a', 'entry-1', 'rundown-a')).toBe(true);
    expect(isEntryCopyTarget('entry-1', 'rundown-a', 'entry-1', 'rundown-b')).toBe(false);
  });
});
