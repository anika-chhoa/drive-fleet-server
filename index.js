const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 8080;

//
//

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);
const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(404).json({
      message: "Unauthorized",
    });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(404).json({
      message: "Unauthorized",
    });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);
    next();
  } catch (error) {
    res.status(403).json({ message: "Forbidden" });
  }
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const db = client.db("drive-fleet");
    const fleetCollections = db.collection("fleetCollections");
    const bookingCollection = db.collection("bookings");

    app.get("/explore", async (req, res) => {
      try {
        const { search, type } = req.query;

        let query = {};

        
        if (search) {
          query.carName = {
            $regex: search,
            $options: "i",
          };
        }

        
        if (type && type !== "All Types") {
          query.carType = type;
        }

        const result = await fleetCollections.find(query).toArray();

        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server Error" });
      }
    });
    app.get("/availableCars", async (req, res) => {
      const result = await fleetCollections
        .find({ availabilityStatus: "Available" })
        .limit(6)
        .toArray();
      res.json(result);
    });

    app.get("/explore/:fleetId", verifyToken, async (req, res) => {
      const { fleetId } = req.params;
      const result = await fleetCollections.findOne({
        _id: new ObjectId(fleetId),
      });
      res.json(result);
    });

    // app.patch("/bookings/:carId", async (req, res) => {
    //   const { carId } = req.params;
    //   const bookingData = req.body;
    //   const targetCar = await fleetCollections.findOne({
    //     _id: new ObjectId(carId),
    //   });
    //   if (!targetCar) {
    //     res.status(404).json({ success: false, message: "Car not found" });
    //   }
    //   await fleetCollections.updateOne(
    //     { _id: new ObjectId(carId) },
    //     {
    //       $inc: { bookingCount: 1 },
    //       $set: {
    //         lastBookingAt: new Date(),
    //       },
    //     },
    //   );
    //   const result = await bookingCollection.insertOne({
    //     ...bookingData,
    //     bookingAt: new Date(),
    //   });
    //   res.json(result);
    // });

    app.post("/bookings", verifyToken, async (req, res) => {
      try {
        const bookingData = req.body;

        const { userId, userName, userEmail, carId } = bookingData;

        if (!userId || !carId) {
          return res.status(400).json({
            success: false,
            message: "userId and carId are required",
          });
        }

        const targetCar = await fleetCollections.findOne({
          _id: new ObjectId(carId),
        });

        if (!targetCar) {
          return res.status(404).json({
            success: false,
            message: "Car not found",
          });
        }

        const alreadyBooked = await bookingCollection.findOne({
          userId,
          carId,
        });

        if (alreadyBooked) {
          return res.status(400).json({
            success: false,
            message: "You already booked this car",
          });
        }
        const newBooking = {
          ...bookingData,

          bookingAt: new Date(),
          status: "confirmed",
        };

        const bookingResult = await bookingCollection.insertOne(newBooking);

        await fleetCollections.updateOne(
          {
            _id: new ObjectId(carId),
          },
          {
            $inc: {
              bookingCount: 1,
            },
            $set: {
              lastBookingAt: new Date(),
            },
          },
        );

        res.status(201).json({
          success: true,
          message: "Booking successful",
          insertedId: bookingResult.insertedId,
        });
      } catch (error) {
        console.log(error);

        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    app.get("/bookings/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId }).toArray();
      res.json(result);
    });

    app.post("/add-car", verifyToken, async (req, res) => {
      const carData = req.body;
      const result = await fleetCollections.insertOne(carData);
      res.json(result);
    });

    app.get("/add-car/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await fleetCollections.find({ userId }).toArray();
      res.json(result);
    });

    app.patch("/explore/:carId", async (req, res) => {
      const { carId } = req.params;
      const updatedData = req.body;
      const result = await fleetCollections.updateOne(
        { _id: new ObjectId(carId) },
        { $set: updatedData },
      );
      res.json(result);
    });

    app.delete("/explore/:carId", async (req, res) => {
      const { carId } = req.params;
      const result = await fleetCollections.deleteOne({
        _id: new ObjectId(carId),
      });
      res.json(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
