import { Request, Response } from "express";
import { getDB } from "../../config/db";
import { ObjectId } from "mongodb";
import { Order, OrderItem } from "./order.model";

const generateOrderNumber = async (): Promise<string> => {
    const db = getDB();
    const year = new Date().getFullYear();

    // Find the latest order number for this year
    const latestOrder = await db.collection("orders")
        .find({ orderNumber: new RegExp(`^ORD-${year}-`) })
        .sort({ orderNumber: -1 })
        .limit(1)
        .toArray();

    let nextNumber = 1;
    if (latestOrder.length > 0) {
        const lastNumber = latestOrder[0].orderNumber.split('-')[2];
        nextNumber = parseInt(lastNumber) + 1;
    }

    return `ORD-${year}-${String(nextNumber).padStart(4, '0')}`;
};

export const createOrder = async (req: Request, res: Response) => {
    try {
        const db = getDB();

        console.log("Order request body:", JSON.stringify(req.body, null, 2));

        const { customer, items, pricing, payment, notes, plan, planName, planPrice, paymentMethod, transactionId, receiverNumber } = req.body;

        if (!customer || !customer.name || !customer.email || !customer.phone) {
            return res.status(400).json({
                success: false,
                message: "Customer information (name, email, phone) is required"
            });
        }

        let pricingData: any;
        let planData: any;

        if (pricing) {
            pricingData = {
                subtotal: pricing.subtotal || pricing.grandTotal || 0,
                grandTotal: pricing.grandTotal || 0,
                currency: pricing.currency || "USD",
                tax: pricing.tax,
                discount: pricing.discount,
                shippingCost: pricing.shippingCost
            };
        } else if (plan) {
            const price = parseFloat(plan.price?.toString().replace(/[^0-9.]/g, '') || '0');
            pricingData = {
                subtotal: price,
                grandTotal: price,
                currency: "USD"
            };
            planData = plan;
        } else if (planPrice) {
            const price = parseFloat(planPrice.toString().replace(/[^0-9.]/g, '') || '0');
            pricingData = {
                subtotal: price,
                grandTotal: price,
                currency: "USD"
            };
            planData = { name: planName, price: planPrice };
        } else {
            return res.status(400).json({
                success: false,
                message: "Pricing information (pricing or plan) is required",
                receivedData: {
                    hasPricing: !!pricing,
                    hasPlan: !!plan,
                    hasPlanPrice: !!planPrice,
                    requestBody: req.body
                }
            });
        }

        if (!pricingData.grandTotal || pricingData.grandTotal <= 0) {
            return res.status(400).json({
                success: false,
                message: "Grand total must be greater than 0"
            });
        }

        let itemsData: OrderItem[];
        if (items && Array.isArray(items) && items.length > 0) {
            itemsData = items;
        } else if (planData) {
            itemsData = [{
                name: planData.name || planName || "Service Plan",
                description: planData.description,
                quantity: 1,
                unitPrice: pricingData.grandTotal,
                totalPrice: pricingData.grandTotal
            }];
        } else {
            return res.status(400).json({
                success: false,
                message: "At least one order item or plan is required"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customer.email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        for (const item of itemsData) {
            if (!item.name || !item.quantity || !item.unitPrice || !item.totalPrice) {
                return res.status(400).json({
                    success: false,
                    message: "Each item must have name, quantity, unitPrice, and totalPrice"
                });
            }
        }

        const finalTransactionId = payment?.transactionId || transactionId;
        if (finalTransactionId) {
            const existingOrder = await db.collection("orders").findOne({
                "payment.transactionId": finalTransactionId
            });

            if (existingOrder) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid transaction ID. This transaction ID already exists."
                });
            }
        }

        const orderNumber = await generateOrderNumber();

        const customerData = {
            ...customer,
            customerId: customer.customerId ? new ObjectId(customer.customerId) : undefined
        };

        const finalItems = itemsData.map((item: OrderItem) => ({
            ...item,
            productId: item.productId ? new ObjectId(item.productId) : undefined,
            serviceId: item.serviceId ? new ObjectId(item.serviceId) : undefined
        }));

        const order: Order = {
            orderNumber,
            orderStatus: "pending",
            customer: customerData,
            items: finalItems,
            pricing: pricingData,
            payment: {
                status: payment?.status || "pending",
                method: payment?.method || paymentMethod,
                transactionId: payment?.transactionId || transactionId,
                receiverNumber: payment?.receiverNumber || receiverNumber
            },
            cancellation: {
                isCancelled: false
            },
            notes: notes || "",
            createdAt: new Date()
        };

        const result = await db.collection("orders").insertOne(order);

        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: { ...order, _id: result.insertedId }
        });
    } catch (error) {
        console.error("Create order error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create order",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Get all orders with filtering and pagination (admin only)
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const {
            orderStatus,
            paymentStatus,
            isCancelled,
            customerId,
            startDate,
            endDate,
            limit,
            skip,
            sortBy = "createdAt",
            sortOrder = "desc"
        } = req.query;

        // Build filter object
        const filter: any = {};

        if (orderStatus) {
            filter.orderStatus = orderStatus;
        }

        if (paymentStatus) {
            filter["payment.status"] = paymentStatus;
        }

        if (isCancelled !== undefined) {
            filter["cancellation.isCancelled"] = isCancelled === 'true';
        }

        if (customerId) {
            filter["customer.customerId"] = new ObjectId(customerId as string);
        }

        // Date range filter
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate as string);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate as string);
            }
        }

        // Build sort object
        const sort: any = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        // Build query with pagination
        let query = db.collection("orders").find(filter).sort(sort);

        if (skip) query = query.skip(Number(skip));
        if (limit) query = query.limit(Number(limit));

        const orders = await query.toArray();
        const totalCount = await db.collection("orders").countDocuments(filter);

        return res.status(200).json({
            success: true,
            count: orders.length,
            totalCount,
            data: orders,
            pagination: {
                skip: Number(skip) || 0,
                limit: Number(limit) || orders.length,
                hasMore: (Number(skip) || 0) + orders.length < totalCount
            }
        });
    } catch (error) {
        console.error("Get all orders error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get orders"
        });
    }
};

// Get order by ID
export const getOrderById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        const db = getDB();
        const order = await db.collection("orders").findOne({ _id: new ObjectId(id as string) });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Check if user is authorized to view this order
        // @ts-ignore - req.user is added by auth middleware
        const user = req.user;
        const isAdmin = user?.role === 'admin';
        const isOwner = user?.uid && order.customer.customerId?.toString() === user.uid;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this order"
            });
        }

        return res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error("Get order by ID error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get order"
        });
    }
};

// Get order by order number
export const getOrderByOrderNumber = async (req: Request, res: Response) => {
    try {
        const { orderNumber } = req.params;

        if (!orderNumber) {
            return res.status(400).json({
                success: false,
                message: "Order number is required"
            });
        }

        const db = getDB();
        const order = await db.collection("orders").findOne({ orderNumber });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Check if user is authorized to view this order
        // @ts-ignore
        const user = req.user;
        const isAdmin = user?.role === 'admin';
        const isOwner = user?.uid && order.customer.customerId?.toString() === user.uid;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this order"
            });
        }

        return res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error("Get order by order number error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get order"
        });
    }
};

// Get user's own orders
export const getUserOrders = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const user = req.user;

        if (!user || !user.uid) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const db = getDB();
        const { orderStatus, paymentStatus, limit, skip } = req.query;

        // Build filter for user's orders
        const filter: any = {
            "customer.customerId": new ObjectId(user.uid)
        };

        if (orderStatus) {
            filter.orderStatus = orderStatus;
        }

        if (paymentStatus) {
            filter["payment.status"] = paymentStatus;
        }

        let query = db.collection("orders").find(filter).sort({ createdAt: -1 });

        if (skip) query = query.skip(Number(skip));
        if (limit) query = query.limit(Number(limit));

        const orders = await query.toArray();
        const totalCount = await db.collection("orders").countDocuments(filter);

        return res.status(200).json({
            success: true,
            count: orders.length,
            totalCount,
            data: orders,
            pagination: {
                skip: Number(skip) || 0,
                limit: Number(limit) || orders.length,
                hasMore: (Number(skip) || 0) + orders.length < totalCount
            }
        });
    } catch (error) {
        console.error("Get user orders error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get orders"
        });
    }
};

// Update order status (admin only)
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { orderStatus } = req.body;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        if (!orderStatus) {
            return res.status(400).json({
                success: false,
                message: "Order status is required"
            });
        }

        const validStatuses = ["pending", "confirmed", "processing", "completed", "cancelled"];
        if (!validStatuses.includes(orderStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid order status. Must be one of: ${validStatuses.join(", ")}`
            });
        }

        const db = getDB();
        const existingOrder = await db.collection("orders").findOne({ _id: new ObjectId(id as string) });

        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Prevent status change if order is cancelled
        if (existingOrder.cancellation.isCancelled && orderStatus !== "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Cannot change status of a cancelled order"
            });
        }

        const result = await db.collection("orders").updateOne(
            { _id: new ObjectId(id as string) },
            {
                $set: {
                    orderStatus,
                    updatedAt: new Date()
                }
            }
        );

        const updatedOrder = await db.collection("orders").findOne({ _id: new ObjectId(id as string) });

        return res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            data: updatedOrder
        });
    } catch (error) {
        console.error("Update order status error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update order status",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Update payment status (admin only)
export const updatePaymentStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { paymentStatus, transactionId, paymentMethod } = req.body;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        if (!paymentStatus) {
            return res.status(400).json({
                success: false,
                message: "Payment status is required"
            });
        }

        const validPaymentStatuses = ["pending", "paid", "failed", "refunded"];
        if (!validPaymentStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(", ")}`
            });
        }

        const db = getDB();
        const existingOrder = await db.collection("orders").findOne({ _id: new ObjectId(id as string) });

        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        const updateData: any = {
            "payment.status": paymentStatus,
            updatedAt: new Date()
        };

        if (paymentStatus === "paid") {
            updateData["payment.paidAt"] = new Date();
        }

        if (transactionId) {
            updateData["payment.transactionId"] = transactionId;
        }

        if (paymentMethod) {
            updateData["payment.method"] = paymentMethod;
        }

        await db.collection("orders").updateOne(
            { _id: new ObjectId(id as string) },
            { $set: updateData }
        );

        const updatedOrder = await db.collection("orders").findOne({ _id: new ObjectId(id as string) });

        return res.status(200).json({
            success: true,
            message: "Payment status updated successfully",
            data: updatedOrder
        });
    } catch (error) {
        console.error("Update payment status error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update payment status",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Cancel order
export const cancelOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        const db = getDB();
        const existingOrder = await db.collection("orders").findOne({ _id: new ObjectId(id as string) });

        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Check if order is already cancelled
        if (existingOrder.cancellation.isCancelled) {
            return res.status(400).json({
                success: false,
                message: "Order is already cancelled"
            });
        }

        // Check if order can be cancelled
        if (existingOrder.orderStatus === "completed") {
            return res.status(400).json({
                success: false,
                message: "Cannot cancel a completed order"
            });
        }

        // @ts-ignore
        const user = req.user;
        const isAdmin = user?.role === 'admin';
        const isOwner = user?.uid && existingOrder.customer.customerId?.toString() === user.uid;

        // Users can only cancel pending or confirmed orders
        if (!isAdmin && (existingOrder.orderStatus !== "pending" && existingOrder.orderStatus !== "confirmed")) {
            return res.status(403).json({
                success: false,
                message: "You can only cancel pending or confirmed orders"
            });
        }

        // Determine who cancelled the order
        let cancelledBy: "user" | "admin" | "system" = "system";
        if (isAdmin) {
            cancelledBy = "admin";
        } else if (isOwner) {
            cancelledBy = "user";
        }

        await db.collection("orders").updateOne(
            { _id: new ObjectId(id as string) },
            {
                $set: {
                    orderStatus: "cancelled",
                    "cancellation.isCancelled": true,
                    "cancellation.cancelledBy": cancelledBy,
                    "cancellation.reason": reason || "No reason provided",
                    "cancellation.cancelledAt": new Date(),
                    updatedAt: new Date()
                }
            }
        );

        const updatedOrder = await db.collection("orders").findOne({ _id: new ObjectId(id as string) });

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data: updatedOrder
        });
    } catch (error) {
        console.error("Cancel order error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to cancel order",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Update order details (admin only)
export const updateOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body is required and must contain update data"
            });
        }

        const db = getDB();
        const existingOrder = await db.collection("orders").findOne({ _id: new ObjectId(id as string) });

        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Prevent updates to completed or cancelled orders
        if (existingOrder.orderStatus === "completed" || existingOrder.cancellation.isCancelled) {
            return res.status(400).json({
                success: false,
                message: "Cannot update completed or cancelled orders"
            });
        }

        // Remove fields that shouldn't be updated directly
        delete updateData._id;
        delete updateData.orderNumber;
        delete updateData.createdAt;
        delete updateData.orderStatus; // Use updateOrderStatus endpoint
        delete updateData.cancellation; // Use cancelOrder endpoint

        // Add updated timestamp
        updateData.updatedAt = new Date();

        await db.collection("orders").updateOne(
            { _id: new ObjectId(id as string) },
            { $set: updateData }
        );

        const updatedOrder = await db.collection("orders").findOne({ _id: new ObjectId(id as string) });

        return res.status(200).json({
            success: true,
            message: "Order updated successfully",
            data: updatedOrder
        });
    } catch (error) {
        console.error("Update order error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update order",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Delete order (admin only)
export const deleteOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        const db = getDB();
        const result = await db.collection("orders").deleteOne({ _id: new ObjectId(id as string) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Order deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Delete order error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete order"
        });
    }
};

// Get order statistics for dashboard (admin only)
export const getOrderStats = async (req: Request, res: Response) => {
    try {
        const db = getDB();

        // Total orders
        const totalOrders = await db.collection("orders").countDocuments();

        // Orders by status
        const ordersByStatus = await db.collection("orders").aggregate([
            {
                $group: {
                    _id: "$orderStatus",
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        // Total revenue (completed orders with paid status)
        const revenueData = await db.collection("orders").aggregate([
            {
                $match: {
                    orderStatus: "completed",
                    "payment.status": "paid"
                }
            },
            {
                $group: {
                    _id: "$pricing.currency",
                    total: { $sum: "$pricing.grandTotal" }
                }
            }
        ]).toArray();

        // Pending payments
        const pendingPayments = await db.collection("orders").countDocuments({
            "payment.status": "pending"
        });

        // Cancelled orders
        const cancelledOrders = await db.collection("orders").countDocuments({
            "cancellation.isCancelled": true
        });

        // Cancellation rate
        const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

        // Recent orders (last 10)
        const recentOrders = await db.collection("orders")
            .find()
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();

        return res.status(200).json({
            success: true,
            data: {
                totalOrders,
                ordersByStatus: ordersByStatus.reduce((acc: any, item: any) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                revenue: revenueData,
                pendingPayments,
                cancelledOrders,
                cancellationRate: cancellationRate.toFixed(2) + "%",
                recentOrders
            }
        });
    } catch (error) {
        console.error("Get order stats error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get order statistics"
        });
    }
};

// Track orders by email (public endpoint)
export const trackOrdersByEmail = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const { email } = req.params;

        // Validate email parameter
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email parameter is required"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Find all orders with the given email
        const orders = await db.collection("orders")
            .find({ "customer.email": email })
            .sort({ createdAt: -1 })
            .toArray();

        // Format the response data
        const trackingData = orders.map((order) => ({
            orderId: order._id,
            orderNumber: order.orderNumber,
            name: order.customer.name,
            email: order.customer.email,
            phone: order.customer.phone,
            paymentStatus: order.payment.status,
            paymentMethod: order.payment.method,
            amount: order.pricing.grandTotal,
            currency: order.pricing.currency,
            orderDate: order.createdAt,
            paidAt: order.payment.paidAt
        }));

        return res.status(200).json({
            success: true,
            message: `Found ${trackingData.length} order(s) for ${email}`,
            count: trackingData.length,
            data: trackingData
        });
    } catch (error) {
        console.error("Track orders by email error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to track orders",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
