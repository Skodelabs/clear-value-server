import express from "express";
import authRoutes from "./routes/authRoutes";
import mediaRoutes from "./routes/mediaRoutes";
import reportRoutes from "./routes/reportRoutes";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));


// Routes - update the path to match frontend
app.use("/auth", authRoutes); // Changed from '/api/auth' to '/auth'
app.use("/media", mediaRoutes); // Routes for image/video processing and AI analysis
app.use("/reports", reportRoutes); // Routes for market research and report generation

// Route to serve the appraisal-report.ejs template for preview
app.get("/", (req, res) => {
  // Sample data to render the template
  const sampleData = {
    options: {
      logoUrl: "https://placeholder.com/150x50",
      currency: "CAD",
    },
    property: {
      address: "123 Sample Street",
      city: "Sample City",
      state: "Sample State",
      zip: "12345",
      effectiveDate: new Date().toISOString(),
    },
    items: [
      {
        id: 1,
        name: "Sample Item 1",
        description: "This is a sample item description",
        condition: "Good",
        price: 1000,
      },
      {
        id: 2,
        name: "Sample Item 2",
        description: "Another sample item description",
        condition: "Excellent",
        price: 2000,
      },
    ],
  };

  res.render("reports/appraisal-report", sampleData);
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
