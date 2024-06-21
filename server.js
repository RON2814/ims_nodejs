const express = require("express");
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const cors = require("cors"); // Add CORS
const path = require("path");
const bodyParser = require('body-parser');
const bcrypt = require("bcrypt");
const { access } = require("fs");

dotenv.config();
const app = express();

const uri = process.env.MONGODB_ATLAS_URI || "";

const client = new MongoClient(uri);

let connectedClient, db;

const col_products = "products", col_accounts = "accounts"; // Collection name

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

app.get("/get_product", async (req, res) => {
    try {
        const limit = parseInt(req.query._limit) || 0;
        let collection = await db.collection(col_products);
        let product = await collection.find().limit(limit).sort({ $natural: -1 }).toArray();

        res.status(200).json(product);
    } catch (e) {
        res.status(500).json({ error: "Products could not be returned." });
    }
});

app.post("/add_product", async (req, res) => { // Fixed path
    try {
        let collection = await db.collection(col_products);
        let product = req.body;
        let result = await collection.insertOne(product);

        res.status(200).json({ request: "Insert success " + result });
    } catch (e) {
        res.status(500).json({ error: "Can't add Product. Error is occur", detailed: e });
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
        res.status(500).json({ error: "Login error" });
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
    }
});