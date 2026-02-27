import { ObjectId } from "mongodb";

export interface CTAButton {
  text: string;
  link: string;
  type: "primary" | "secondary";
}

export interface BannerImage {
  id: number;
  title: string;
  imageUrl: string;
}

export interface HeroBanner {
  _id?: ObjectId;
  badge: string;
  title: {
    highlight: string;
    text: string;
  };
  description: string;
  ctaButtons: CTAButton[];
  images: BannerImage[];
  layout: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}
