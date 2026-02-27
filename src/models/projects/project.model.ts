import { ObjectId } from "mongodb";

export interface Project {
  _id?: ObjectId;
  id?: string; // Made optional since it will be auto-generated
  title: string;
  description: string;
  tags: string[];
  thumbnail: string;
  previewUrl?: string;
  isFeatured: boolean;
  order: number;
}

// Input interface for creating projects (without MongoDB-specific fields)
export interface ProjectInput {
  id?: string;
  title: string;
  description: string;
  tags?: string[];
  thumbnail: string;
  previewUrl?: string;
  isFeatured?: boolean;
  order: number;
}

export interface ProjectCategory {
  _id?: ObjectId;
  id?: string; // Made optional since it will be auto-generated
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
  projects: Project[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Input interface for creating project categories (without MongoDB-specific fields)
export interface ProjectCategoryInput {
  id?: string;
  name: string;
  description?: string;
  order: number;
  isActive?: boolean;
}

export interface ProjectFilters {
  isActive?: boolean;
  isFeatured?: boolean;
  tags?: string[];
}