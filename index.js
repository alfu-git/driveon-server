const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Hello From Server");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("driveon-db");
    const carsCollection = db.collection("cars");

    // get all cars
    app.get("/cars", async (req, res) => {
      const cursor = carsCollection.find();
      const result = await cursor.toArray();
      res.json(result);
    });

    // get car by id
    app.get("/cars/:carId", async (req, res) => {
      const { carId } = req.params;
      const query = {
        _id: new ObjectId(carId),
      };
      const result = await carsCollection.findOne(query);
      res.json(result);
    });

    // post user added car
    app.post("/added-cars", async (req, res) => {
      const addedCarDoc = req.body;
      const result = await carsCollection.insertOne(addedCarDoc);
      res.json(result);
    });

    // get user added car
    app.get("/added-cars/:userId", async (req, res) => {
      const { userId } = req.params;
      const query = {
        userId: userId,
      };
      const result = await carsCollection.find(query).toArray();
      res.json(result);
    });

    // update user added car
    app.patch("/added-cars/:carId", async (req, res) => {
      const { carId } = req.params;
      const updateCarData = req.body;

      const result = await carsCollection.updateOne(
        { _id: new ObjectId(carId) },
        { $set: updateCarData },
      );

      res.json(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
