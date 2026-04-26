
const ROUTES = [
    ['GET', /^\/customers$/, (m, b, q) => window.api.customers.getAll(q)],
    ['GET', /^\/customers\/suggestions$/, (m, b, q) => window.api.customers.suggestions(q)],
    ['GET', /^\/customers\/([^/]+)\/statement$/, (m) => window.api.customers.statement(m[1])],
    ['GET', /^\/customers\/([^/]+)\/balances$/, () => window.api.customers.balances()],
    ['GET', /^\/customers\/([^/]+)$/, (m) => window.api.customers.getOne(m[1])],
    ['POST', /^\/customers$/, (_, b) => window.api.customers.create(b)],
    ['PUT', /^\/customers\/([^/]+)$/, (m, b) => window.api.customers.update(m[1], b)],
    ['DELETE', /^\/customers\/([^/]+)$/, (m) => window.api.customers.delete(m[1])],

    ['GET', /^\/products$/, () => window.api.products.getAll()],
    ['GET', /^\/products\/([^/]+)$/, (m) => window.api.products.getOne(m[1])],
    ['POST', /^\/products$/, (_, b) => window.api.products.create(b)],
    ['PUT', /^\/products\/([^/]+)$/, (m, b) => window.api.products.update(m[1], b)],
    ['DELETE', /^\/products\/([^/]+)$/, (m) => window.api.products.delete(m[1])],

    ['GET', /^\/sales$/, () => window.api.sales.getAll()],
    ['GET', /^\/sales\/([^/]+)$/, (m) => window.api.sales.getOne(m[1])],
    ['POST', /^\/sales$/, (_, b) => window.api.sales.create(b)],
    ['POST', /^\/sales\/([^/]+)\/cancel$/, (m) => window.api.sales.cancel(m[1])],
    ['DELETE', /^\/sales\/([^/]+)$/, (m) => window.api.sales.delete(m[1])],

    ['GET', /^\/installments$/, () => window.api.installments.getAll()],
    ['PUT', /^\/installments\/([^/]+)\/pay$/, (m, b) => window.api.installments.pay(m[1], b)],
    ['PUT', /^\/installments\/([^/]+)\/cancel$/, (m, b) => window.api.installments.cancel(m[1], b)],

    ['GET', /^\/payments$/, () => window.api.payments.getAll()],
    ['POST', /^\/payments\/expense$/, (_, b) => window.api.payments.addExpense(b)],
    ['POST', /^\/payments\/addManual$/, (_, b) => window.api.payments.addManual(b)],
    ['POST', /^\/payments\/manual$/, (_, b) => window.api.payments.addManual(b)],
    ['POST', /^\/payments$/, (_, b) => window.api.payments.create(b)],

    ['GET', /^\/stats\/treasury$/, () => window.api.stats.treasury()],
    ['GET', /^\/stats$/, () => window.api.stats.dashboard()],

    ['DELETE', /^\/system\/reset$/, (_, b) => window.api.system.reset(b)],

    ['GET', /^\/suppliers$/, (m, b, q) => window.api.suppliers.getAll(q)],
    ['GET', /^\/suppliers\/([^/]+)\/statement$/, (m) => window.api.suppliers.statement(m[1])],
    ['GET', /^\/suppliers\/([^/]+)$/, (m) => window.api.suppliers.getOne(m[1])],
    ['POST', /^\/suppliers$/, (_, b) => window.api.suppliers.create(b)],
    ['PUT', /^\/suppliers\/([^/]+)$/, (m, b) => window.api.suppliers.update(m[1], b)],
    ['DELETE', /^\/suppliers\/([^/]+)$/, (m) => window.api.suppliers.delete(m[1])],

    ['GET', /^\/purchases$/, (m, b, q) => window.api.purchases.getAll(q)],
    ['GET', /^\/purchases\/([^/]+)$/, (m) => window.api.purchases.getOne(m[1])],
    ['POST', /^\/purchases\/supplier-payment$/, (_, b) => window.api.purchases.supplierPayment(b)],
    ['POST', /^\/purchases$/, (_, b) => window.api.purchases.create(b)],
    ['PUT', /^\/purchases\/([^/]+)$/, (m, b) => window.api.purchases.update(m[1], b)],
    ['DELETE', /^\/purchases\/([^/]+)$/, (m) => window.api.purchases.delete(m[1])],
];








function isPlainObject(val) {
    return (
        val !== null &&
        typeof val === 'object' &&
        Object.prototype.toString.call(val) === '[object Object]' &&
        Object.getPrototypeOf(val) === Object.prototype
    );
}





function normalizeData(data) {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
        return data.map(item => normalizeData(item));
    }

    if (isPlainObject(data)) {
        const normalized = { ...data };

        if (normalized._id && !normalized.id) {
            normalized.id = normalized._id;
        }

        for (const key in normalized) {
            normalized[key] = normalizeData(normalized[key]);
        }

        return normalized;
    }


    return data;
}





function unwrapPayload(raw, path, method = 'GET') {
    if (!raw) {
        console.warn(`[api] [unwrap] NULL/UNDEFINED input for ${path}`);
        return raw;
    }

    console.log(`[api] [unwrap] RAW input [${method} ${path}]:`, raw);


    if (raw && typeof raw === 'object' && raw.success === false) {
        const error = new Error(raw.message || 'Unknown Backend Error');
        error.response = { data: { error: raw.message } };
        throw error;
    }


    const cleanPath = path.split('?')[0].replace(/\/$/, '') || '/';


    const isListEndpoint = 
        method === 'GET' && (
            /^\/(customers|products|sales|installments|payments|suppliers|purchases)$/.test(cleanPath) ||
            cleanPath.includes('/suggestions') ||
            cleanPath.includes('/balances')
        );


    let payload = Array.isArray(raw) ? raw : (raw.data !== undefined ? raw.data : raw);


    if (!Array.isArray(payload) && isPlainObject(payload) && payload.data !== undefined) {
        payload = payload.data;
    }

    console.log(`[api] [unwrap] DETECTED PAYLOAD candidate:`, payload, `(isList: ${isListEndpoint})`);


    if (isListEndpoint) {
        if (Array.isArray(payload)) {
            console.log(`[api] [unwrap] Success: Array contract fulfilled.`);
            return payload;
        }


        if (isPlainObject(raw)) {
            const fallbackArray = Object.values(raw).find(v => Array.isArray(v));
            if (fallbackArray) {
                console.warn(`[api] [unwrap] HEURISTIC: Identified array in secondary key.`);
                return fallbackArray;
            }
        }

        console.error(`[api] [unwrap] CRITICAL: List endpoint ${path} returned non-array:`, typeof payload);
        return []; 
    }


    if (!isPlainObject(payload) && !Array.isArray(payload)) {
        const isSingleResource = /\/[^/]+$/.test(cleanPath);
        if (isSingleResource) {
            console.error(`[api] [unwrap] CRITICAL: Object endpoint ${path} returned non-object:`, typeof payload);
            return {}; 
        }
    }


    if (payload === raw && isPlainObject(raw)) {
        const { success, message, count, ...cleanPayload } = raw;
        return cleanPayload;
    }

    console.log(`[api] [unwrap] Success: Payload returned.`);
    return payload;
}





async function route(method, path, body = {}) {
    const [urlPath, queryString] = path.split('?');
    const normalised = urlPath.replace(/\/$/, '') || '/';

    let queryParams = {};
    if (queryString) {
        queryParams = Object.fromEntries(new URLSearchParams(queryString).entries());
    }

    for (const [routeMethod, regex, handler] of ROUTES) {
        if (routeMethod !== method) continue;

        const match = normalised.match(regex);
        if (!match) continue;

        try {
            // Payload Validation (Temporary for production-readiness check)
            if (method === 'POST' || method === 'PUT') {
                const checkNumeric = (obj, pathPrefix = '') => {
                    for (const key in obj) {
                        const val = obj[key];
                        const fullKey = pathPrefix ? `${pathPrefix}.${key}` : key;
                        if (typeof val === 'number' && !Number.isInteger(val)) {
                            console.warn(`[PayloadValidator] FLOAT DETECTED in ${method} ${path}: key="${fullKey}", value=${val}. Financial values must be integer cents.`);
                        } else if (isPlainObject(val)) {
                            checkNumeric(val, fullKey);
                        } else if (Array.isArray(val)) {
                            val.forEach((item, idx) => isPlainObject(item) && checkNumeric(item, `${fullKey}[${idx}]`));
                        }
                    }
                };
                checkNumeric(body);
            }

            console.log(`[api] [request] ${method} ${path}`, body);
            const rawResponse = await handler(match, body, queryParams);

                        const unwrappedResult = unwrapPayload(rawResponse, path, method);
            const finalPayload = normalizeData(unwrappedResult);

            return { data: finalPayload };

        } catch (err) {
            console.error(`[api] [failure] ${method} ${path}:`, err.message);


            const axiosLikeError = new Error(err.message || 'Unknown API Error');
            axiosLikeError.isAxiosError = true;
            axiosLikeError.response = err.response || { 
                data: { error: err.message || 'Connection failed' },
                status: err.status || 500
            };

                        throw axiosLikeError;
        }
    }

    const noRouteErr = new Error(
        `[api.js] No IPC route matched: ${method} ${path}\n` +
        `  → Add a regex entry to ROUTES[] in api.js\n` +
        `  → Expose the method in preload.js window.api.*\n` +
        `  → Register the IPC channel in src/ipc/handlers.js`
    );
    console.error(noRouteErr.message);
    throw noRouteErr;
}





const api = {
    get:    (path) => route('GET', path),
    post:   (path, body = {}) => route('POST', path, body),
    put:    (path, body = {}) => route('PUT', path, body),
    delete: (path, config = {}) => route('DELETE', path, config?.data ?? {}),
};

export default api;