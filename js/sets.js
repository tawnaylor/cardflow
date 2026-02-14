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
