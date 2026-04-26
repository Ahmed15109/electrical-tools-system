const toEnglishDigits = (str) => {
    if (typeof str !== 'string') return str;
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return str.replace(/[٠-٩]/g, (char) => arabicNumbers.indexOf(char));
};

const sanitizeObjectPath = (obj) => {
    for (let key in obj) {
        if (obj[key] === null || obj[key] === undefined) {
            continue;
        }

        if (typeof obj[key] === 'string') {
            obj[key] = toEnglishDigits(obj[key]);
        } else if (typeof obj[key] === 'object') {
            sanitizeObjectPath(obj[key]);
        }
    }
};

const normalizeDigits = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        sanitizeObjectPath(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        sanitizeObjectPath(req.query);
    }
    next();
};

module.exports = normalizeDigits;
