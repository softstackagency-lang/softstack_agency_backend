import express from "express";
import {
    createOrder,
    getAllOrders,
    getOrderById,
    getOrderByOrderNumber,
    getUserOrders,
    updateOrderStatus,
    updatePaymentStatus,
    cancelOrder,
    updateOrder,
    deleteOrder,
    getOrderStats,
    trackOrdersByEmail
} from "./order.controller";
import { verifyToken, requireAdmin } from "../../middlewares/auth.middleware";

const router = express.Router();

router.post("/",verifyToken, createOrder);
router.get("/track/:email", trackOrdersByEmail);

router.get("/my-orders", verifyToken, getUserOrders);
router.get("/:id/status", verifyToken, getOrderById);
router.patch("/:id/cancel", verifyToken, cancelOrder);

router.get("/", verifyToken, requireAdmin, getAllOrders);
router.get("/stats", verifyToken, requireAdmin, getOrderStats);
router.get("/number/:orderNumber", verifyToken, getOrderByOrderNumber);
router.get("/:id", verifyToken, getOrderById);
router.patch("/:id/status", verifyToken, requireAdmin, updateOrderStatus);
router.patch("/:id/payment", verifyToken, requireAdmin, updatePaymentStatus);
router.put("/:id", verifyToken, requireAdmin, updateOrder);
router.delete("/:id", verifyToken, requireAdmin, deleteOrder);

export default router;
