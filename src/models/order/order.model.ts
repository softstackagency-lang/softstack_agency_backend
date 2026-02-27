import { ObjectId } from "mongodb";

export interface OrderPricing {
    subtotal: number;
    tax?: number;
    discount?: number;
    shippingCost?: number;
    grandTotal: number;
    currency: string; // e.g., "BDT", "USD"
}

export interface OrderPayment {
    status: "pending" | "paid" | "failed" | "refunded";
    method?: string;
    transactionId?: string;
    receiverNumber?: string;
    paidAt?: Date;
}

export interface OrderCancellation {
    isCancelled: boolean;
    cancelledBy?: "user" | "admin" | "system";
    reason?: string;
    cancelledAt?: Date;
}

export interface OrderCustomer {
    customerId?: ObjectId; // Reference to user if authenticated
    name: string;
    email: string;
    phone: string;
    address?: string;
}

export interface OrderItem {
    productId?: ObjectId;
    serviceId?: ObjectId;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface Order {
    _id?: ObjectId;
    orderNumber: string; // Auto-generated unique order number (e.g., ORD-2026-0001)
    orderStatus: "pending" | "confirmed" | "processing" | "completed" | "cancelled";
    customer: OrderCustomer;
    items: OrderItem[];
    pricing: OrderPricing;
    payment: OrderPayment;
    cancellation: OrderCancellation;
    notes?: string; // Admin or customer notes
    createdAt: Date;
    updatedAt?: Date;
}
