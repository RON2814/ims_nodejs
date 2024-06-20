const express = require("express");
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const cors = require("cors"); // Add CORS

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
        let product = await collection.find().limit(limit).sort({$natural:-1}).toArray();

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
        // Add your login logic here
    } catch (e) {
        res.status(500).json({ error: "Login error" });
    }
});

app.post("/signup", async (req, res) => {
    try {
        let collection = await db.collection(col_accounts);
        let signup = await collection.insertOne(req.body); // Fixed insertion logic

        res.status(200).json({ request: "Signup success " + signup });
    } catch (e) {
        res.status(500).json({ error: "Signup error" });
    }
});
