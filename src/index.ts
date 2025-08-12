import { Express } from "express";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { configDotenv } from "dotenv";
import { superAdminRoutes } from "./routes/super-admin.routes";
import { createSuperAdmin } from "./config/app.config";
import { districtAdminRoutes } from "./routes/district-admin.routes";
import { schoolAdminRoutes } from "./routes/school-admin.routes";
import { teacherRoutes } from "./routes/teachers.routes";
import { demoRoutes } from "./routes/demo.routes";
import { mailRoutes } from "./routes/mail.routes";
import { authRoutes } from "./routes/auth.routes";
import classRoutes from "./routes/class.routes";
import studentRoutes from "./routes/student.routes";

// DotEnv
configDotenv();

const app: Express = express();
const port = process.env.PORT || 8080;

// CORS configuration
const corsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

// Add custom middleware to handle preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Api Routes
// auth
app.use("/api/auth", authRoutes);
// super-admin
app.use("/api/super-admin", superAdminRoutes);
// district-admin
app.use("/api/district-admin", districtAdminRoutes);
// school-admin
app.use("/api/school-admin", schoolAdminRoutes);
// teacher
app.use("/api/teachers", teacherRoutes);
// mail
app.use("/api/mail", mailRoutes);
// demo requests
app.use("/api/demo", demoRoutes);
// classes
app.use("/api/classes", classRoutes);
// student
app.use("/api/student", studentRoutes);

app.get("/api", (_req, res) =>
  res.status(200).json({
    message: "hello",
  })
);

// listen
app.listen(port, () => {
  createSuperAdmin();
  console.log(`Server is running on port ${port}`);
});
