
const { ipcMain } = require('electron');
const customerController    = require('../controllers/customerController');
const productController     = require('../controllers/productController');
const salesController       = require('../controllers/salesController');
const installmentController = require('../controllers/installmentController');
const paymentController     = require('../controllers/paymentController');
const statsController       = require('../controllers/statsController');
const systemController      = require('../controllers/systemController');
const supplierController    = require('../controllers/supplierController');
const purchaseController    = require('../controllers/purchaseController');

function callController(fn, params = {}, body = {}, query = {}) {
    return new Promise((resolve, reject) => {
        let responded = false;

        const req = {
            params,
            body,
            query,
            ip: '127.0.0.1'
        };

        const res = {
            _statusCode: 200,
            status(code) {
                this._statusCode = code;
                return this;   
            },
            json(data) {
                if (responded) {
                    console.warn('[IPC] Controller attempted to respond twice.');
                    return;
                }
                responded = true;

                try {

                    let serialized = data ? JSON.parse(JSON.stringify(data)) : data;


                    const { normalizeEntity } = require('../../src/mappers/normalize');
                    serialized = normalizeEntity(serialized);

                                        if (this._statusCode >= 400) {
                        reject(new Error(serialized?.error || serialized?.message || JSON.stringify(serialized)));
                    } else {
                        resolve(serialized);
                    }
                } catch (serializeErr) {
                    console.error('[IPC] Serialization Error:', serializeErr);
                    reject(new Error('Failed to process response: ' + serializeErr.message));
                }
            },
            send(data) { this.json(data); },
            end() { 
                if (!responded) {
                    responded = true;
                    resolve({ success: true }); 
                }
            }
        };


        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => {
                const funcName = fn ? fn.name : 'UnknownFunction';
                reject(new Error(`Backend Controller Timeout in ${funcName} (8000ms)`));
            }, 8000)
        );

        Promise.race([
            (async () => {
                if (typeof fn !== 'function') {
                    throw new Error(`Controller function is not defined or not a function.`);
                }
                await fn(req, res);

                if (!responded) {
                    console.warn(`[IPC] Controller ${fn.name || 'anonymous'} finished without calling res.json()! Forcing success.`);
                    res.json({ success: true, message: 'Operation completed (auto-resolved)' });
                }
            })(),
            timeoutPromise
        ]).catch(err => {
            if (!responded) {
                responded = true;
                console.error(`[IPC] Controller CRASHED OR TIMED OUT:`, err);
                reject(new Error(err.message || 'Internal IPC Error'));
            }
        });
    });
}








function handle(channel, controllerFn, argsMapper = () => [{}, {}, {}]) {
    ipcMain.handle(channel, async (_event, args = {}) => {
        const [params, body, query] = argsMapper(args);
        return callController(controllerFn, params, body, query);
    });
}



function registerIpcHandlers() {


    handle('customers:getAll',
        customerController.getCustomers,
        (a) => [{}, {}, a.query || {}]);

    handle('customers:suggestions',
        customerController.getCustomerSuggestions,
        (a) => [{}, {}, a.query || {}]);

    handle('customers:getOne',
        customerController.getCustomer,
        (a) => [{ id: a.id }, {}, {}]);

    handle('customers:create',
        customerController.createCustomer,
        (a) => [{}, a.body, {}]);

    handle('customers:update',
        customerController.updateCustomer,
        (a) => [{ id: a.id }, a.body, {}]);

    handle('customers:delete',
        customerController.deleteCustomer,
        (a) => [{ id: a.id }, {}, {}]);

    handle('customers:balances',
        customerController.getCustomerBalances,
        (a) => [{}, {}, a.query || {}]);

    handle('customers:statement',
        customerController.getCustomerStatement,
        (a) => [{ id: a.id }, {}, {}]);


    handle('products:getAll',
        productController.getProducts,
        (a) => [{}, {}, a.query || {}]);

    handle('products:getOne',
        productController.getProduct,
        (a) => [{ id: a.id }, {}, {}]);

    handle('products:create',
        productController.createProduct,
        (a) => [{}, a.body, {}]);

    handle('products:update',
        productController.updateProduct,
        (a) => [{ id: a.id }, a.body, {}]);

    handle('products:delete',
        productController.deleteProduct,
        (a) => [{ id: a.id }, {}, {}]);


    handle('sales:getAll',
        salesController.getSales,
        (a) => [{}, {}, a.query || {}]);

    handle('sales:getOne',
        salesController.getSale,
        (a) => [{ id: a.id }, {}, {}]);

    handle('sales:create',
        salesController.createSale,
        (a) => [{}, a.body, {}]);

    handle('sales:delete',
        salesController.deleteSale,
        (a) => [{ id: a.id }, {}, {}]);
        
    handle('sales:cancel',
        salesController.cancelSale,
        (a) => [{ id: a.id }, {}, {}]);


    handle('installments:getAll',
        installmentController.getInstallments);

    handle('installments:getByCustomer',
        installmentController.getInstallmentsByCustomer,
        (a) => [{ id: a.id }, {}, {}]);

    handle('installments:pay',
        installmentController.payInstallment,
        (arg) => {
            const id = (typeof arg === 'string') ? arg : arg.id;
            const body = (arg && arg.body) ? arg.body : {};
            return [{ id }, body, {}];
        });

    handle('installments:cancel',
        installmentController.cancelInstallmentPayment,
        (arg) => {
            const id = (typeof arg === 'string') ? arg : arg.id;
            const body = (arg && arg.body) ? arg.body : {};
            return [{ id }, body, {}];
        });


    handle('payments:getAll',
        paymentController.getPayments);

    handle('payments:create',
        paymentController.createPayment,
        (a) => [{}, a.body, {}]);

    handle('payments:addExpense',
        paymentController.addExpense,
        (a) => [{}, a.body, {}]);

    handle('payments:addManual',
        paymentController.addManual,
        (a) => [{}, a.body, {}]);


    handle('stats:dashboard',
        statsController.getDashboardStats);

    handle('stats:treasury',
        statsController.getTreasurySummary);


    handle('system:reset',
        systemController.resetSystem,
        (a) => [{}, a.body, {}]);


    handle('suppliers:getAll',
        supplierController.getSuppliers,
        (a) => [{}, {}, a.query || {}]);

    handle('suppliers:getOne',
        supplierController.getSupplier,
        (a) => [{ id: a.id }, {}, {}]);

    handle('suppliers:create',
        supplierController.createSupplier,
        (a) => [{}, a.body, {}]);

    handle('suppliers:update',
        supplierController.updateSupplier,
        (a) => [{ id: a.id }, a.body, {}]);

    handle('suppliers:delete',
        supplierController.deleteSupplier,
        (a) => [{ id: a.id }, {}, {}]);

    handle('suppliers:statement',
        supplierController.getSupplierStatement,
        (a) => [{ id: a.id }, {}, {}]);


    handle('purchases:getAll',
        purchaseController.getPurchases,
        (a) => [{}, {}, a.query || {}]);

    handle('purchases:getOne',
        purchaseController.getPurchase,
        (a) => [{ id: a.id }, {}, {}]);

    handle('purchases:create',
        purchaseController.createPurchase,
        (a) => [{}, a.body, {}]);

    handle('purchases:update',
        purchaseController.updatePurchase,
        (a) => [{ id: a.id }, a.body, {}]);

    handle('purchases:delete',
        purchaseController.deletePurchase,
        (a) => [{ id: a.id }, {}, {}]);

    handle('purchases:supplierPayment',
        purchaseController.createSupplierPayment,
        (a) => [{}, a.body, {}]);

    console.log('[IPC] All handlers registered.');
}

module.exports = { registerIpcHandlers };
