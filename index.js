const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const db = client.db("drive-fleet");
    const fleetCollections = db.collection("fleetCollections");
    const bookingCollection = db.collection("bookings");

    // app.get("/explore", async (req, res) => {
    //   const {search}=req.query;
    //   let cursor;

    //   if(search){
    //     cursor=await fleetCollections.find({
    //       $or:[
    //         {
    //           carName:{
    //             $regex:search,
    //             $options:'i',
    //           }
    //         },
    //         {
    //           carType:{
    //             $regex:search,
    //             $options:'i',
    //           }
    //         }
    //       ]
    //     })
    //   }else{
    //     cursor=fleetCollections.find();
    //   }
    //   const result = await cursor.toArray();
    //   res.json(result);
    // });

    app.get("/explore", async (req, res) => {
  const { search, type } = req.query;  // ← add type here

  const query = {};

  if (search) {
    query.$or = [
      { carName: { $regex: search, $options: "i" } },
      { carType: { $regex: search, $options: "i" } },
    ];
  }

  if (type) {
    query.carType = { $regex: `^${type}$`, $options: "i" }; // exact match
  }

  const result = await fleetCollections.find(query).toArray();
  res.json(result);
});

    app.get("/availableCars", async (req, res) => {
      const result = await fleetCollections
        .find({ availabilityStatus: "Available" })
        .limit(6)
        .toArray();
      res.json(result);
    });

    app.get("/explore/:fleetId", async (req, res) => {
      const { fleetId } = req.params;
      const result = await fleetCollections.findOne({
        _id: new ObjectId(fleetId),
      });
      res.json(result);
    });

    app.patch("/bookings/:carId", async (req, res) => {
      const { carId } = req.params;
      const bookingData = req.body;
      const targetCar = await fleetCollections.findOne({
        _id: new ObjectId(carId),
      });
      if (!targetCar) {
        res.status(404).json({ success: false, message: "Car not found" });
      }
      await fleetCollections.updateOne(
        { _id: new ObjectId(carId) },
        {
          $inc: { bookingCount: 1 },
          $set: {
            lastBookingAt: new Date(),
          },
        },
      );
      const result = await bookingCollection.insertOne({
        ...bookingData,
        bookingAt: new Date(),
      });
      res.json(result);
    });

    app.get("/bookings/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId }).toArray();
      res.json(result);
    });


    app.post("/add-car",async(req,res)=>{
      const carData= req.body;
      const result= await fleetCollections.insertOne(carData);
      res.json(result)
    })













    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
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
