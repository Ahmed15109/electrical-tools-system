const { contextBridge, ipcRenderer } = require('electron');


const invoke = (channel, args) => ipcRenderer.invoke(channel, args);

contextBridge.exposeInMainWorld('api', {
    customers: {
        getAll:      (query)         => invoke('customers:getAll',    { query }),
        suggestions: (query)         => invoke('customers:suggestions', { query }),
        getOne:      (id)            => invoke('customers:getOne',    { id }),
        create:    (body)          => invoke('customers:create',    { body }),
        update:    (id, body)      => invoke('customers:update',    { id, body }),
        delete:    (id)            => invoke('customers:delete',    { id }),
        balances:  (query = {})    => invoke('customers:balances',  { query }),
        statement: (id)            => invoke('customers:statement', { id }),
    },
    products: {
        getAll: (query)       => invoke('products:getAll', { query }),
        getOne: (id)          => invoke('products:getOne', { id }),
        create: (body)        => invoke('products:create', { body }),
        update: (id, body)    => invoke('products:update', { id, body }),
        delete: (id)          => invoke('products:delete', { id }),
    },
    sales: {
        getAll: (query)       => invoke('sales:getAll', { query }),
        getOne: (id)   => invoke('sales:getOne',  { id }),
        create: (body) => invoke('sales:create',  { body }),
        delete: (id)   => invoke('sales:delete',  { id }),
        cancel: (id)   => invoke('sales:cancel',  { id }),
    },
    installments: {
        getAll:        ()          => invoke('installments:getAll'),
        getByCustomer: (id)        => invoke('installments:getByCustomer', { id }),
        pay:           (id, body)  => invoke('installments:pay',    { id, body }),
        cancel:        (id, body)  => invoke('installments:cancel', { id, body }),
    },
    payments: {
        getAll:     ()     => invoke('payments:getAll'),
        create:     (body) => invoke('payments:create',     { body }),
        addExpense: (body) => invoke('payments:addExpense', { body }),
        addManual:  (body) => invoke('payments:addManual',  { body }),
    },
    stats: {
        dashboard: () => invoke('stats:dashboard'),
        treasury:  () => invoke('stats:treasury'),
    },
    system: {
        backup:             ()                => invoke('system:backup'),
        restore:            ()                => invoke('system:restore'),
        restart:            ()                => invoke('system:restart'),
        reset:              (body)            => invoke('system:reset', { body }),
        uploadFile:         (sourcePath, subdirectory) => invoke('system:uploadFile', { sourcePath, subdirectory }),
        selectBackupFolder: ()                => invoke('system:selectBackupFolder'),
        openBackupFolder:   ()                => invoke('system:openBackupFolder'),
        getSettings:        ()                => invoke('system:getSettings'),
        updateSettings:     (updates)         => invoke('system:updateSettings', updates),
    },
    suppliers: {
        getAll:    (query)      => invoke('suppliers:getAll',    { query }),
        getOne:    (id)         => invoke('suppliers:getOne',    { id }),
        create:    (body)       => invoke('suppliers:create',    { body }),
        update:    (id, body)   => invoke('suppliers:update',    { id, body }),
        delete:    (id)         => invoke('suppliers:delete',    { id }),
        statement: (id)         => invoke('suppliers:statement', { id }),
    },
    purchases: {
        getAll:          (query) => invoke('purchases:getAll',          { query }),
        getOne:          (id)    => invoke('purchases:getOne',          { id }),
        create:          (body)  => invoke('purchases:create',          { body }),
        update:          (id, body) => invoke('purchases:update',       { id, body }),
        delete:          (id)    => invoke('purchases:delete',          { id }),
        supplierPayment: (body)  => invoke('purchases:supplierPayment', { body }),
    },
    pdf: {
        generate: (payload) => ipcRenderer.invoke('pdf:generate', payload),
    },
});
