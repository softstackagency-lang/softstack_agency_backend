import { ObjectId } from 'mongodb';

export interface IUser {
  _id?: ObjectId;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  image?: string;
  provider?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt?: Date;
  updatedAt?: Date;
}
