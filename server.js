const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');
const normalizeDigits = require('./src/middleware/normalizeDigits');
const path = require('path');

const customerRoutes = require('./src/routes/customerRoutes');
const productRoutes = require('./src/routes/productRoutes');
const salesRoutes = require('./src/routes/salesRoutes');
const installmentRoutes = require('./src/routes/installmentRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const statsRoutes = require('./src/routes/statsRoutes');
const systemRoutes = require('./src/routes/systemRoutes');
const supplierRoutes = require('./src/routes/supplierRoutes');
const purchaseRoutes = require('./src/routes/purchaseRoutes');

dotenv.config();

function startServer(initialPort) {
    connectDB();

    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(normalizeDigits);

    app.use('/api/customers', customerRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/sales', salesRoutes);
    app.use('/api/installments', installmentRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/stats', statsRoutes);
    app.use('/api/system', systemRoutes);
    app.use('/api/suppliers', supplierRoutes);
    app.use('/api/purchases', purchaseRoutes);

    app.use(express.static(path.join(__dirname, 'client/dist')));

    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: 'Route not found'
        });
    });

    const PORT = initialPort || process.env.PORT || 5000;

    function tryListen(portToTry) {
        const server = app.listen(portToTry, () => {
            console.log(`Server running on port ${portToTry}`);
            if (process.send) process.send({ event: 'server-started', port: portToTry });
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                const nextPort = portToTry + 1;
                console.log(`[Backend] Port ${portToTry} in use. Trying port ${nextPort}...`);
                tryListen(nextPort);
            } else {
                console.error('[Backend] Server error:', err);
            }
        });

        return server;
    }

    return tryListen(PORT);
}

module.exports = startServer;


if (require.main === module) {
    startServer();
}
