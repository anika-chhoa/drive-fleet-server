const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();
const app = express();
app.use(cors());
const port = process.env.PORT || 8080;

//
//

const uri =
  "mongodb+srv://drive-fleet:YgUgm0gbz621VURG@cluster0.icbwmfr.mongodb.net/?appName=Cluster0";

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

    app.get("/explore", async (req, res) => {
      const result = await fleetCollections.find().toArray();
      res.json(result);
    });
    app.get("/explore/:fleetId", async (req, res) => {
      const {fleetId}=req.params;
       const result=await fleetCollections.findOne({_id:new ObjectId(fleetId)})
      res.json(result);
    });

    





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
