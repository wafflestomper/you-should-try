// "How you know them" groups (St. Chris, Tennis, Church…), stored as one comma-separated line per person
export const groupsOf = (t) => String(t || '').split(',').map((s) => s.trim()).filter(Boolean);
export const groupsText = (list) => [...new Set(list.map((s) => String(s).trim()).filter(Boolean))].join(', ').slice(0, 120) || null;
