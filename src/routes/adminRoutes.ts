import { Router } from "express";
import { AdminController } from "../controllers/adminController";
import { UserManagementController } from "../controllers/userManagementController";
import { adminAuthMiddleware, superAdminAuthMiddleware } from "../middleware/adminAuth";

const router = Router();
const adminController = new AdminController();
const userManagementController = new UserManagementController();

// Debug middleware
router.use((req, res, next) => {
  console.log(`Admin Route accessed: ${req.method} ${req.url}`);
  next();
});

// Public admin routes (no auth required)
router.post("/login", (req, res) => adminController.login(req, res));
router.post("/seed", (req, res) => adminController.seedAdmins(req, res));

// Routes requiring admin authentication
router.get("/", adminAuthMiddleware, (req, res) => adminController.getAllAdmins(req, res));
router.patch("/:adminId", adminAuthMiddleware, (req, res) => adminController.updateAdmin(req, res));
router.patch("/:adminId/password", adminAuthMiddleware, (req, res) => adminController.changePassword(req, res));

// User management routes (admin access)
router.get("/users", adminAuthMiddleware, (req, res) => userManagementController.getAllUsers(req, res));
router.get("/users/stats", adminAuthMiddleware, (req, res) => userManagementController.getUserStats(req, res));
router.get("/users/:userId", adminAuthMiddleware, (req, res) => userManagementController.getUserById(req, res));
router.patch("/users/:userId/block", adminAuthMiddleware, (req, res) => userManagementController.blockUser(req, res));
router.delete("/users/:userId", superAdminAuthMiddleware, (req, res) => userManagementController.deleteUser(req, res));

// Routes requiring super admin authentication
router.post("/create", superAdminAuthMiddleware, (req, res) => adminController.createAdmin(req, res));
router.delete("/:adminId", superAdminAuthMiddleware, (req, res) => adminController.deleteAdmin(req, res));
router.patch("/:adminId/block", superAdminAuthMiddleware, (req, res) => adminController.blockAdmin(req, res));

export default router;
