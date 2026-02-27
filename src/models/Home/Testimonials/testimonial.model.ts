import { ObjectId } from "mongodb";

export interface Testimonial {
    _id?: ObjectId;
    name: string;
    designation: string;
    company: string;
    rating: number; // 1-5
    message: string;
    avatar: string;
    isFeatured: boolean;
    createdAt: Date;
    updatedAt?: Date;
}
