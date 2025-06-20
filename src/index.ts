import express from "express";
import authRoutes from "./routes/authRoutes";
import mediaRoutes from "./routes/mediaRoutes";
import reportRoutes from "./routes/reportRoutes";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import cors from "cors";
import adminRoutes from "./routes/adminRoutes";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));

// Routes - update the path to match frontend
app.use("/auth", authRoutes); // Changed from '/api/auth' to '/auth'
app.use("/media", mediaRoutes); // Routes for image/video processing and AI analysis
app.use("/reports", reportRoutes); // Routes for market research and report generation

// Admin routes
app.use("/admin", adminRoutes);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));

// Serve public files statically
app.use("/public", express.static(path.join(__dirname, "../public")));

// Route to get image by filename
app.get("/image/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "Image not found" });
  }
});

// Route to serve the appraisal-report.ejs template for preview
app.get("/", (req, res) => {
  // Sample data to render the template
  res.render("reports/appraisal-report");
});



// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
  }
);

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/clear-value")
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
