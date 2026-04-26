const path = require('path');
const db = require('./src/models/index');

async function test() {
    try {
        console.log("Setting up data...");

        const customer = await db.Customer.create({
            name: "Test Customer",
            phone: "01000000000"
        });
        console.log("Customer created with ID:", customer._id);


        const product = await db.Product.create({
            name: "Test Product",
            price: 100,
            stock: 10
        });
        console.log("Product created with ID:", product._id);


        const req = {
            body: {
                customer: customer._id,
                products: [{ product: product._id, quantity: 1 }],
                paymentMethod: 'cash',
                interestRate: 0,
                months: 0,
                downPayment: 100
            }
        };

        const res = {
            status: (code) => {
                return {
                    json: (data) => console.log("Response:", code, data)
                };
            }
        };

        const salesController = require('./src/controllers/salesController');
        console.log("Calling createSale...");
        await salesController.createSale(req, res);

    } catch(err) {
        console.error("Test Error:", err);
    }
}
test();
