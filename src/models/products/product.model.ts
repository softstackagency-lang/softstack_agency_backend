import { ObjectId } from 'mongodb';

export interface Product {
  _id?: ObjectId;
  slug: string;
  title: string;
  tagline: string;
  description: string;

  coverImage: {
    url: string;
    alt: string;
  };

  badge?: {
    label: string;
    color: string;
  };
    liveLink?: string;
    repoLink?: string;

  highlights: { label: string; value: string }[];
  features: string[];

  cta: {
    text: string;
    url: string;
  };

  theme: {
    gradientFrom: string;
    gradientTo: string;
  };

  status: "active" | "inactive";
  order: number;

  postedBy: ObjectId; //USER ID
  createdAt: Date;
}
