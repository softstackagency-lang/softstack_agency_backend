import { connectDB } from "../../config/db";

const samplePricingData = {
  "id": "ai-agent",
  "name": "AI Agent",
  "order": 1,
  "isActive": true,
  "plans": [
    {
      "id": "startup",
      "name": "Startup",
      "description": "Perfect for small teams",
      "type": "fixed",
      "popular": false,
      "price": {
        "USD": 3000,
        "BDT": 330000
      },
      "billingCycle": "monthly",
      "features": [
        "1 Senior Developer (Part Time)",
        "1 Senior Designer (Part Time)",
        "Shared Project Manager",
        "80 Development Hours / Month",
        "20 Design Hours / Month",
        "Basic Support (Email + Slack)"
      ],
      "cta": {
        "text": "Contact To Get Started",
        "action": "contact"
      },
      "order": 1
    },
    {
      "id": "growth",
      "name": "Growth",
      "description": "For growing companies",
      "type": "fixed",
      "popular": true,
      "price": {
        "USD": 5000,
        "BDT": 550000
      },
      "billingCycle": "monthly",
      "features": [
        "1 Senior Developer (Full Time)",
        "1 Senior Designer (Part Time)",
        "Dedicated Project Manager",
        "140 Development Hours / Month",
        "30 Design Hours / Month",
        "Priority Support + Weekly Calls"
      ],
      "cta": {
        "text": "Contact To Get Started",
        "action": "contact"
      },
      "order": 2
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "description": "Custom solutions for large teams",
      "type": "custom",
      "popular": false,
      "price": {
        "USD": null,
        "BDT": null
      },
      "billingCycle": "custom",
      "features": [
        "Custom Development Team",
        "Custom Design Team",
        "Senior Project Manager",
        "Unlimited Hours",
        "24/7 Priority Support",
        "Custom Integrations & Solutions"
      ],
      "cta": {
        "text": "Contact To Get Started",
        "action": "contact"
      },
      "order": 3
    }
  ],
  "createdAt": new Date(),
  "updatedAt": new Date()
};

export const seedPricingData = async () => {
  try {
    const db = await connectDB();

    // Insert sample pricing category with plans
    const existingCategory = await db.collection("pricingCategories").findOne({ id: samplePricingData.id });
    if (!existingCategory) {
      await db.collection("pricingCategories").insertOne(samplePricingData);
      console.log("✅ Sample pricing category inserted successfully");
    } else {
      console.log("⚠️  Sample pricing category already exists");
    }

    console.log("🚀 Pricing data seeding completed!");

  } catch (error) {
    console.error("❌ Error seeding pricing data:", error);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  seedPricingData().then(() => {
    process.exit(0);
  });
}