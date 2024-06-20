const express = require("express");
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();
const app = express();

const uri = process.env.MONGODB_URI || "";

const client = new MongoClient(uri);

let connectedClient, db;

const col_products = "Products", col_accounts = "Accounts"; // Collection name !!!!

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

app.listen(3000, () => {
    console.log("app is listening on port 3000");
});

connectToMDB();

// Test API Endpoint (req-request res-response)

app.get("/api/get_product", async (req, res) => {
    try {
        let collection = await db.collection(col_products);
        let product = await collection.find().toArray();

        res.status(200).json(product);
    } catch (e) {
        res.status(500).json({error: "Products could not be returned."});
    }
});

app.post("api/add_product", async (req, res) => {
    try {
        let collection = await db.collection(col_products);
        let product = req.body;
        let result = await collection.insertOne(product);

        res.status(200).json({request:"Insert success " + result});
    } catch (e) {
        res.status(500).json({error: "Can't add Product. Error is occur"});
    }
});

app.post("api/login", async (req, res) => {
    try {
        
    } catch (e) {
        res.status(500).json({error: "Login error"});
    }
});

app.post("api/signup", async (req, res) => {
    try {
        let collection = await db.collection(col_accounts);
        
        let signup = await db.collection.insertOne();
    } catch (e) {
        res.status(500).json({error: "Login error"});
    }
});