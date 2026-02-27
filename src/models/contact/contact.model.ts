import { ObjectId } from "mongodb";

export interface Contact {
    _id?: ObjectId;
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    status: "new" | "read" | "replied" | "archived";
    createdAt: Date;
    readAt?: Date;
    repliedAt?: Date;
}
