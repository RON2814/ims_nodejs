const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const cors = require("cors"); // Add CORS
const path = require("path");
const bodyParser = require('body-parser');
const bcrypt = require("bcrypt");
const { access } = require("fs");

dotenv.config();
const app = express();

const uri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_LOCAL_URI;

const client = new MongoClient(uri);

let connectedClient, db;

const colProducts = "products", colAccount = "accounts", colArchive = "archive_products"; // <- Collection name

async function connectToMDB() {
    try {
        connectedClient = await client.connect();
        console.log("Connected to MongoDB");
    } catch (e) {
        console.log(e);
    } finally {
        db = connectedClient.db("inventory_system"); // <- database name
    }
}

app.use(cors()); // Use CORS middleware
app.use(express.json()); // Use JSON middleware

app.listen(3000, () => {
    console.log("app is listening on port 3000");
});

connectToMDB();

// Test API Endpoint (req-request res-response)

// -- please check this is the query section !!! --
app.get("/get-product", async (req, res) => {
    try {
        const limit = parseInt(req.query._limit) || 0;
        const page = parseInt(req.query._page) || 1;
        let collection = await db.collection(colProducts);
        let product = await collection.find()
            .limit(limit).skip(limit * (page - 1)).sort({ $natural: -1 }).toArray();

        res.status(200).json(product);
    } catch (e) {
        res.status(500).json({ error: "Products could not be returned.", detailed: e.toString() });
        console.log(e);
    }
});

app.get("/get-low-product", async (req, res) => {
    try {
        const limit = parseInt(req.query._limit) || 10;
        const page = parseInt(req.query._page) || 1;
        let collection = await db.collection(colProducts);
        let lowqty = await collection.aggregate([
            { $match: { quantity: { $lte: 10 } } },
            { $sort: { _id: -1 } },
            { $skip: limit * (page - 1) },
            { $limit: limit }
        ]).toArray();

        res.status(200).json(lowqty);
    } catch (e) {
        res.status(500).json({ error: "Products could not be returned.", detailed: e.toString() });
        console.log(e);
    }
});

app.get("/get-out-product", async (req, res) => {
    try {

    } catch (e) {
        res.status(500).json({ error: "Products could not be returned.", detailed: e.toString() });
        console.log(e);
    }
});

app.get("/get-total-expenses", async (req, res) => {
    try {

    } catch (e) {
        res.status(500).json({ error: "Products could not be returned.", detailed: e.toString() });
        console.log(e);
    }
});

app.get("/search-product", async (req, res) => {
    try {
        const searchQuery = String(req.query.search) || "";
        const limit = parseInt(req.query._limit) || 0;
        const page = parseInt(req.query._page) || 1;

        const regex = new RegExp(searchQuery, 'i');

        let collection = await db.collection(colProducts);
        let result = await collection.find({ product_name: { $regex: regex } },
        ).limit(limit).skip(limit * (page - 1)).toArray();

        res.status(200).json(result);
    } catch (e) {
        res.status(500).json({ error: "Products could not be returned.", detailed: e.toString() });
        console.log(e);
    }
});

app.post("/get-one-product", async (req, res) => {
    try {
        let collection = await db.collection(colProducts);

        let prodId = req.body.id;
        let product = await collection.findOne(
            { _id: ObjectId.createFromHexString(prodId) },
            { returnOriginal: false }
        );

        if (product) {
            res.status(200).json(product);
        } else {
            res.status(404).json({ error: "Product not found." });
        }
    } catch (e) {
        res.status(500).json({ error: "Product could not be returned." });
        console.log(e);
    }
});

app.post("/insert-product", async (req, res) => { // Fixed path
    try {
        let collection = await db.collection(colProducts);
        let product = req.body;
        let result = await collection.insertOne(product);

        res.status(200).json({ request: "Insert success " + result, isInserted: "true" });
    } catch (e) {
        res.status(500).json({ error: "Can't Insert Product. Error is occur", detailed: e.toString() });
        console.log(e);
    }
});

app.get("/get-total-product", async (req, res) => {
    try {
        let collection = await db.collection(colProducts);
        let totalProd = await collection.countDocuments();

        res.status(200).json({ total_product: totalProd });
    } catch (e) {
        res.status(500).json({ error: "Can't fetch total product", detailed: e.toString() });
        console.log(e);
    }
});

app.post("/update-product", async (req, res) => {
    try {
        let collection = await db.collection(colProducts);
        let upProd = req.body;
        console.log(upProd);
        let isAdded, qtyToUpdate;
        if (upProd.new_qty > upProd.old_qty) {
            isAdded = true;
            qtyToUpdate = upProd.new_qty - upProd.old_qty;
        } else if (upProd.new_qty < upProd.old_qty) {
            isAdded = false
            qtyToUpdate = upProd.old_qty - upProd.new_qty;
        }

        let product = await collection.findOne({ id: ObjectId.createFromHexString(upProd.id) });
        let maxId = 0;

        if (product && product.history && product.history.length > 0) {
            maxId = Math.max(...product.history.map(h => h.id));
        }

        let newHistoryId = maxId + 1;

        if(upProd.new_qty == upProd.old_qty) {
            let result = await collection.updateOne({
                _id: ObjectId.createFromHexString(upProd.id),
                quantity: { $lte: upProd.new_qty }
            },
                {
                    $set: {
                        product_name: upProd.product_name,
                        product_price: upProd.product_price,
                        quantity: upProd.new_qty,
                        category: upProd.category,
                        description: upProd.product_desc,
                    },
                },
                { returnOriginal: false }
            );
            console.log(result);
        } else {
            let result = await collection.updateOne({
                _id: ObjectId.createFromHexString(upProd.id),
                quantity: { $lte: upProd.new_qty }
            },
                {
                    $set: {
                        product_name: upProd.product_name,
                        product_price: upProd.product_price,
                        quantity: upProd.new_qty,
                        category: upProd.category,
                        description: upProd.product_desc,
                    },
                    $push: {
                        history: {
                            id: newHistoryId,
                            isAdded: isAdded,
                            qty: qtyToUpdate,
                            date_added: upProd.updated_at
                        }
                    }
                },
                { returnOriginal: false }
            );
            console.log(result);
        }
        res.status(200).json({ request: "Updated success", isUpdated: "true" });
    } catch (error) {
        res.status(500).json({ error: "Can't Update Product. Error is occur", detailed: error.toString() });
        console.log(error);
    }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// D E L E T E ! ! ! caution
app.post("/delete-product", async (req, res) => { 
    try { 
        let collection = await db.collection(colProducts); 
        let archiveProduct = await db.collection(colArchive); 

        let product = req.body; // Expecting a single product object
        let responses = [];
        
        let prodId = product.id;
        try { 
            // Validate prodId length 
            if (!ObjectId.isValid(prodId)) { 
                responses.push({ id: prodId, status: 'Invalid Product ID', error: true }); 
                return res.status(400).json({ message: "Invalid Product ID", results: responses });
            } 

            let objectId = ObjectId.createFromHexString(prodId); 

            let result = await collection.findOne({ _id: objectId }); 

            if (!result) { 
                responses.push({ id: prodId, status: 'Product not found', error: true }); 
                return res.status(404).json({ message: "Product not found", results: responses });
            } 

            // Copy result to archive 
            await archiveProduct.insertOne(result); 

            // Remove product from collection 
            await collection.deleteOne({ _id: objectId }); 

            responses.push({ id: prodId, status: 'Deleted and archived', error: false, isDeleted: true}); 
        } catch (innerError) { 
            responses.push({ id: prodId, status: 'Delete operation failed', error: true, detailed: innerError.toString() }); 
            return res.status(500).json({ message: "Delete operation failed", results: responses });
        } 

        res.status(200).json({ message: "Product is delete.", results: responses }); 

    } catch (e) { 
        res.status(500).json({ error: "Can't delete product. Error occurred.", detailed: e.toString() }); 
        console.log(e); 
    } 
});


/*app.post("/delete-product", async (req, res) => {
    try {
        let collection = await db.collection(colProducts);
        let archiveProduct = await db.collection(colArchive);
        
        let products = req.body; // Expecting an array of products
        let responses = [];

        for (let prod of products) {
            let prodId = prod.id;
            try {
                // Validate prodId length
                if (!ObjectId.isValid(prodId)) {
                    responses.push({ id: prodId, status: 'Invalid Product ID', error: true });
                    continue; 
                }

                let objectId = ObjectId.createFromHexString(prodId);

                let result = await collection.findOne({ _id: objectId });

                if (!result) {
                    responses.push({ id: prodId, status: 'Product not found', error: true });
                    continue;
                }

                // Copy result to archive
                await archiveProduct.insertOne(result);

                // Remove product from collection
                await collection.deleteOne({ _id: objectId });

                responses.push({ id: prodId, status: 'Deleted and archived', error: false, isUpdated: true});
            } catch (innerError) {
                responses.push({ id: prodId, status: 'Delete operation failed', error: true, detailed: innerError.toString() });
            }
        }

        res.status(200).json({ message: "Products processed", results: responses });

    } catch (e) {
        res.status(500).json({ error: "Can't delete products. Error occurred.", detailed: e.toString() });
        console.log(e);
    }
}); */



app.post("/login", async (req, res) => {
    try {
        let collection = await db.collection(colAccount);
        const check = await collection.findOne({ username: req.body.username });
        if (!check) {
            res.status(401).json({ request: "username connot found.", access: false });
        } else {
            const isPwdMatch = await bcrypt.compare(req.body.password, check.password);
            if (isPwdMatch) {
                res.status(200).json({ request: "login success!", access: true });
            } else {
                res.status(401).json({ request: "Password is incorrect", access: false });
            }
        }
    } catch (e) {
        res.status(500).json({ error: "Login error", detailed: e.toString() });
        console.log(e);
    }
});

// app.post("/signup", async (req, res) => {
//     try {
//         let collection = await db.collection(colAccount);
//         let signup = await collection.insertOne(req.body); // Fixed insertion logic

//         res.status(200).json({ request: "Signup success " + signup });
//     } catch (e) {
//         res.status(500).json({ error: "Signup error" });
//     }
// });


app.get("/add-account", (req, res) => {
    res.sendFile(path.resolve(__dirname, "pages", "add_account.html"));
});

app.post("/add-account", async (req, res) => {
    try {
        let account = req.body;
        let collection = await db.collection(colAccount);
        const existingUser = await collection.findOne({ username: account.username });

        if (existingUser) {
            res.status(200).json({ request: account.username + " is already exist" });
        } else {
            const saltRounds = 10;
            const hashedPwd = await bcrypt.hash(account.password, saltRounds);

            account.password = hashedPwd;

            let result = await collection.insertOne(account);
            res.status(200).json({ request: "Insert success username: " + account.username });
        }
    } catch (e) {
        res.status(500).json({ error: "Can't add Account. Error is occur", detailed: e });
        console.log(e);
    }
});