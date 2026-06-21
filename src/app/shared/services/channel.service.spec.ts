import { Channel } from '../interfaces/channel.interface';
import { mapAndSortChannels } from './channel.service';

/**
 * Tests for the pure channel list projection/sorting used by the contact-bar.
 * Extracted from `getSortedChannels` so it can be tested without Firestore.
 */
describe('channel.service - mapAndSortChannels', () => {
  /** Builds a minimal channel doc with an id for the projection. */
  function channel(
    id: string,
    name: string,
    createdBy = 'owner'
  ): Channel & { id: string } {
    return { id, cName: name, cCreatedByUser: createdBy } as Channel & {
      id: string;
    };
  }

  it('projects the relevant fields', () => {
    const result = mapAndSortChannels([channel('c1', 'General', 'u1')]);
    expect(result[0]).toEqual({
      id: 'c1',
      name: 'General',
      createdAt: 0,
      createdBy: 'u1',
    });
  });

  it('sorts channels alphabetically by name', () => {
    const result = mapAndSortChannels([
      channel('c1', 'Zebra'),
      channel('c2', 'Apfel'),
      channel('c3', 'Mango'),
    ]);
    expect(result.map((c) => c.name)).toEqual(['Apfel', 'Mango', 'Zebra']);
  });

  it('sorts case-insensitively (German collation)', () => {
    const result = mapAndSortChannels([
      channel('c1', 'beta'),
      channel('c2', 'Alpha'),
    ]);
    expect(result.map((c) => c.name)).toEqual(['Alpha', 'beta']);
  });

  it('returns an empty array for no channels', () => {
    expect(mapAndSortChannels([])).toEqual([]);
  });

  it('preserves the document id for each item', () => {
    const result = mapAndSortChannels([
      channel('idA', 'Bravo'),
      channel('idB', 'Alpha'),
    ]);
    expect(result[0].id).toBe('idB');
    expect(result[1].id).toBe('idA');
  });
});
