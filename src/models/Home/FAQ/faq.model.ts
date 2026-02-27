import { ObjectId } from "mongodb";

export interface FAQ {
    _id?: ObjectId;
    question: string;
    answer: string;
    isActive: boolean;
    order: number;
    createdAt: Date;
    updatedAt?: Date;
}
