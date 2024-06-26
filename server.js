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

const col_products = "products", col_accounts = "accounts"; // <- Collection name

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
        const limit = parseInt(req.query._limit) || 1;
        const page = parseInt(req.query._page) || 1;
        let collection = await db.collection(col_products);
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
        let collection = await db.collection(col_products);
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
        const limit = parseInt(req.query._limit) || 1;
        const page = parseInt(req.query._page) || 1;

        const regex = new RegExp(searchQuery, 'i');

        let collection = await db.collection(col_products);
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
        let collection = await db.collection(col_products);

        let prodId = req.body.id;
        let product = await collection.findOne({ _id: new ObjectId(prodId) });

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
        let collection = await db.collection(col_products);
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
        let collection = await db.collection(col_products);
        let totalProd = await collection.countDocuments();

        res.status(200).json({ total_product: totalProd });
    } catch (e) {
        res.status(500).json({ error: "Can't fetch total product", detailed: e.toString() });
        console.log(e);
    }
});

app.post("/update-product", async (req, res) => {
    try {
        let collection = await db.collection(col_products);
        let updatedProduct = req.body;
        let result = await collection.updateOne({});
    } catch (error) {
        res.status(500).json({ error: "Can't Update Product. Error is occur", detailed: e.toString() });
        console.log(e);
    }
});

app.post("/login", async (req, res) => {
    try {
        let collection = await db.collection(col_accounts);
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
//         let collection = await db.collection(col_accounts);
//         let signup = await collection.insertOne(req.body); // Fixed insertion logic

//         res.status(200).json({ request: "Signup success " + signup });
//     } catch (e) {
//         res.status(500).json({ error: "Signup error" });
//     }
// });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/add-account", (req, res) => {
    res.sendFile(path.resolve(__dirname, "pages", "add_account.html"));
});

app.post("/add-account", async (req, res) => {
    try {
        let account = req.body;
        let collection = await db.collection(col_accounts);
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