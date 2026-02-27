import dotenv from 'dotenv';
dotenv.config();

import { connectDB, closeDB } from '../../../config/db';

const seedBanner = async () => {
    try {
        const db = await connectDB();
        console.log('Connected to database');

        // Deactivate all existing banners
        await db.collection('home_banners').updateMany(
            { isActive: true },
            { $set: { isActive: false, updatedAt: new Date() } }
        );

        // Insert the new banner
        const banner = {
            badge: "BD-Stack Solutions Agency",
            title: {
                highlight: "Modern",
                text: "Build Modern & Scalable Web Experiences"
            },
            description: "We design and develop high-performance websites and web applications using modern technologies like React, Next.js, and Tailwind CSS.",
            ctaButtons: [
                {
                    text: "Get Started",
                    link: "/contact",
                    type: "primary"
                },
                {
                    text: "View Our Work",
                    link: "/projects",
                    type: "secondary"
                }
            ],
            images: [
                {
                    id: 1,
                    title: "UX Design",
                    imageUrl: "https://yourdomain.com/images/hero/ux-design.png"
                },
                {
                    id: 2,
                    title: "Web Development",
                    imageUrl: "https://yourdomain.com/images/hero/web-development.png"
                },
                {
                    id: 3,
                    title: "WordPress Solutions",
                    imageUrl: "https://yourdomain.com/images/hero/wordpress.png"
                },
                {
                    id: 4,
                    title: "App Development",
                    imageUrl: "https://yourdomain.com/images/hero/app-development.png"
                },
                {
                    id: 5,
                    title: "E-Commerce",
                    imageUrl: "https://yourdomain.com/images/hero/ecommerce.png"
                }
            ],
            layout: "grid-5",
            isActive: true,
            createdAt: new Date()
        };

        const result = await db.collection('home_banners').insertOne(banner);

        console.log('✅ Banner seeded successfully!');
        console.log('Inserted ID:', result.insertedId);

        await closeDB();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding banner:', error);
        process.exit(1);
    }
};

seedBanner();
