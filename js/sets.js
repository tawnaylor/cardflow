export const SETS = {
  pokemon: [
    { set: 'Base Set', setCode: 'BS' },
    { set: 'Jungle', setCode: 'JU' },
    { set: 'Fossil', setCode: 'FO' },
    { set: 'Emerald', setCode: 'EM' },
    { set: 'XY', setCode: 'XY' }
  ],
  mtg: [
    { set: 'Alpha', setCode: 'LEA' },
    { set: 'Commander', setCode: 'CMD' },
    { set: 'Revised Edition', setCode: '3ED' },
    { set: 'Ice Age', setCode: 'ICE' }
  ]
};

export function groupBySet(cards) {
  const map = {};
  (cards || []).forEach(c => {
    const name = c.set || 'Unknown Set';
    if (!map[name]) map[name] = [];
    map[name].push(c);
  });
  return map;
}

export function listSets(cards) {
  return Object.keys(groupBySet(cards));
}
