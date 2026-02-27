import { ObjectId } from "mongodb";

export interface Service {
  _id?: ObjectId;
  title: string;
  shortDescription: string;
  category: string;
  tags: string[];
  images: {
    thumbnail: string;
    gallery: string[];
  };
  links: {
    liveDemo?: string;
    youtubeDemo?: string;
    githubRepo?: string;
  };
  pricing: {
    basePrice: number;
    currency: string;
  };
  deliveryTimeDays: number;
  features: string[];
  technologies: string[];
  requirements: {
    businessName: boolean;
    businessType: boolean;
    pagesCount: boolean;
    contentProvided: boolean;
    referenceWebsites: boolean;
    domainHosting: boolean;
  };
  status: 'active' | 'inactive' | 'draft';
  createdAt: Date;
  updatedAt?: Date;
}

export interface ServiceFilters {
  category?: string;
  status?: string;
  tags?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
}

export interface ServiceCategory {
  _id?: ObjectId;
  id: string; // Auto-generated from name (e.g., "web-development")
  name: string; // URL-friendly name (e.g., "web-development")
  title: string; // Display name (e.g., "Web Development")
  description: string;
  icon?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt?: Date;
}