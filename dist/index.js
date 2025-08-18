"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = require("dotenv");
const super_admin_routes_1 = require("./routes/super-admin.routes");
const app_config_1 = require("./config/app.config");
const district_admin_routes_1 = require("./routes/district-admin.routes");
const school_admin_routes_1 = require("./routes/school-admin.routes");
const teachers_routes_1 = require("./routes/teachers.routes");
const demo_routes_1 = require("./routes/demo.routes");
const mail_routes_1 = require("./routes/mail.routes");
const auth_routes_1 = require("./routes/auth.routes");
const class_routes_1 = __importDefault(require("./routes/class.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
// DotEnv
(0, dotenv_1.configDotenv)();
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)(corsOptions));
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
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)("dev"));
// Api Routes
// auth
app.use("/api/auth", auth_routes_1.authRoutes);
// super-admin
app.use("/api/super-admin", super_admin_routes_1.superAdminRoutes);
// district-admin
app.use("/api/district-admin", district_admin_routes_1.districtAdminRoutes);
// school-admin
app.use("/api/school-admin", school_admin_routes_1.schoolAdminRoutes);
// teacher
app.use("/api/teachers", teachers_routes_1.teacherRoutes);
// mail
app.use("/api/mail", mail_routes_1.mailRoutes);
// demo requests
app.use("/api/demo", demo_routes_1.demoRoutes);
// classes
app.use("/api/classes", class_routes_1.default);
// student
app.use("/api/student", student_routes_1.default);
app.get("/api", (_req, res) => res.status(200).json({
    message: "hello",
}));
// listen
app.listen(port, () => {
    (0, app_config_1.createSuperAdmin)();
    console.log(`Server is running on port ${port}`);
});
//# sourceMappingURL=index.js.map