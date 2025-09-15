import express from "express";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// ✅ Allow requests only from your frontend (localhost for dev, Vercel in prod)
app.use(
  cors({
    origin: [
              process.env.FRONTEND_URL,
              "http://localhost:3000",
              "http://localhost:9002",
              "https://traffic-flow-ttpx.vercel.app",
            ],
    methods: ["GET", "POST"],
  })
);

// ✅ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ MongoDB setup
const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const collection = client.db("videosDB").collection("videos");

// ---------------- ROUTES ---------------- //

// 📌 Generate signed upload URL for Cloudinary
app.get("/get-upload-signature", async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "student_project";

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder,
    });
  } catch (err) {
    console.error("Signature error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Save video metadata in MongoDB
app.post("/save-video", async (req, res) => {
  try {
    const { name, url, public_id } = req.body;

    await collection.insertOne({
      name,
      url,
      public_id,
      uploadedAt: new Date(),
    });

    res.json({ message: "Video metadata saved ✅" });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Get all uploaded videos
app.get("/videos", async (req, res) => {
  try {
    const videos = await collection.find().sort({ uploadedAt: -1 }).toArray();
    res.json(videos);
  } catch (err) {
    console.error("Fetch videos error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📌 Root endpoint
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// ---------------- START SERVER ---------------- //
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
