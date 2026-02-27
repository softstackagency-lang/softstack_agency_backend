import { ObjectId } from "mongodb";

export interface TeamMember {
  _id?: ObjectId;
  id: string;
  name: string;
  role: string;
  roleValue: number;
  department: string;
  profileImage: string;
  bio: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  joinedDate: string;
  skills: string[];
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    email?: string;
    github?: string;
  };
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt?: Date;
}

export interface Department {
  _id?: ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TeamFilters {
  department?: string;
  status?: string;
  role?: string;
  skills?: string[];
}
