import { ObjectId } from "mongodb";

export interface PricingPlan {
  _id?: ObjectId;
  id?: string; // Made optional since it will be auto-generated
  name: string;
  description: string;
  type: 'fixed' | 'custom';
  popular: boolean;
  price: {
    USD: number | null;
    BDT: number | null;
  };
  billingCycle: 'monthly' | 'yearly' | 'custom';
  features: string[];
  cta: {
    text: string;
    action: string;
  };
  order: number;
}

export interface PricingCategory {
  _id?: ObjectId;
  id?: string; // Made optional since it will be auto-generated
  name: string;
  order: number;
  isActive: boolean;
  plans: PricingPlan[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface PricingFilters {
  isActive?: boolean;
  type?: 'fixed' | 'custom';
  category?: string;
}

export interface PricingResponse {
  categories: PricingCategory[];
}