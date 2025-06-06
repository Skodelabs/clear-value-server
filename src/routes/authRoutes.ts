import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const authController = new AuthController();

// Debug middleware
router.use((req, res, next) => {
  console.log(`Auth Route accessed: ${req.method} ${req.url}`);
  next();
});

// Auth routes
router.post("/signup", (req, res) => authController.signup(req, res));
router.post("/login", (req, res) => authController.login(req, res));
router.get("/verify/:userId", (req, res) => authController.verify(req, res));
router.post("/logout", (req, res) => authController.logout(req, res));
router.post("/reset-password", authMiddleware, (req, res) =>
  authController.resetPassword(req, res)
);
router.post("/update-username", authMiddleware, (req, res) =>
  authController.updateUsername(req, res)
);

export default router;
