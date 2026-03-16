import { ObjectId } from "mongodb";

export interface Blog {
  _id?: ObjectId;
  id: string;
  image: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogInput {
  image: string;
  title: string;
  description: string;
  tags?: string[] | string;
}
