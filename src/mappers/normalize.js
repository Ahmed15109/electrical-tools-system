
function normalizeEntity(data) {
    if (data === null || data === undefined) return data;


    if (Array.isArray(data)) {
        return data.map(item => normalizeEntity(item));
    }


    if (typeof data === 'object' && !(data instanceof Date)) {
        const normalized = {};

        for (const [key, value] of Object.entries(data)) {

            if (key === '_id') {
                normalized['id'] = value;
            } else {
                normalized[key] = normalizeEntity(value);
            }
        }
        return normalized;
    }


    return data;
}

module.exports = { normalizeEntity };
