const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
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

// jwt verify middleware
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    console.error("Token validation failed:", error);
    throw error;
  }
};

async function run() {
  try {
    // await client.connect();

    const db = client.db("driveon-db");
    const carsCollection = db.collection("cars");
    const bookingsCollection = db.collection("user-bookings");

    // get all cars
    app.get("/cars", async (req, res) => {
      const { userId = "", search = "", carType = "" } = req.query;

      const query = {};

      if (search) {
        query.$or = [
          { carName: { $regex: search, $options: "i" } },
          { brandName: { $regex: search, $options: "i" } },
        ];
      }

      if (carType) {
        const carTypeArray = carType.split(",");
        query.carType = { $in: carTypeArray };
      }

      if (userId) {
        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              { userId: null },
              { userId: userId },
            ],
          },
        ];
      } else {
        query.userId = null;
      }

      const result = await carsCollection.find(query).toArray();
      res.json(result);
    });

    // get car by id
    app.get("/cars/:carId", verifyToken, async (req, res) => {
      const { carId } = req.params;
      const query = {
        _id: new ObjectId(carId),
      };
      const result = await carsCollection.findOne(query);
      res.json(result);
    });

    // post user added car
    app.post("/added-cars", verifyToken, async (req, res) => {
      const addedCarDoc = req.body;
      const result = await carsCollection.insertOne(addedCarDoc);
      res.json(result);
    });

    // get user added car
    app.get("/added-cars/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const query = {
        userId: userId,
      };
      const result = await carsCollection.find(query).toArray();
      res.json(result);
    });

    // update user added car
    app.patch("/added-cars/:carId", verifyToken, async (req, res) => {
      const { carId } = req.params;
      const updateCarData = req.body;

      const result = await carsCollection.updateOne(
        { _id: new ObjectId(carId) },
        { $set: updateCarData },
      );

      res.json(result);
    });

    // delete user added car
    app.delete("/added-cars/:carId", verifyToken, async (req, res) => {
      const { carId } = req.params;
      const query = {
        _id: new ObjectId(carId),
      };
      const result = await carsCollection.deleteOne(query);
      res.json(result);
    });

    // post user bookings car
    app.post("/user-bookings", verifyToken, async (req, res) => {
      const bookingDoc = req.body;
      const result = await bookingsCollection.insertOne(bookingDoc);

      await carsCollection.updateOne(
        { carName: bookingDoc?.carName },
        { $inc: { bookingCount: 1 } },
      );

      res.json(result);
    });

    // get user all bookings car
    app.get("/user-bookings/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingsCollection.find({ userId }).toArray();
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
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
