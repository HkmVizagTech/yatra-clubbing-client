export type ObjectKind = 'temple' | 'mountain' | 'drum' | 'thali' | 'gem';

/** Picks a little 3D object for a highlight from its title. */
export function kindFor(title: string): ObjectKind {
  const t = (title || '').toLowerCase();
  if (/(temple|darshan|mandir|shrine|rama|krishna)/.test(t)) return 'temple';
  if (/(hill|trek|walk|climb|mountain|view)/.test(t)) return 'mountain';
  if (/(kirtan|bhajan|chant|music|sing|dance|pastime)/.test(t)) return 'drum';
  if (/(prasad|feast|lunch|food|meal|breakfast)/.test(t)) return 'thali';
  return 'gem';
}
