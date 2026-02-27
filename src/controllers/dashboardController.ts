import { Request, Response } from "express";
import { getDB } from "../config/db";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const ordersCol = db.collection("orders");
    const usersCol = db.collection("users");
    const productsCol = db.collection("products");
    const pricingCol = db.collection("pricing");

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Total revenue from paid orders
    const revenueAgg = await ordersCol.aggregate([
      { $match: { "payment.status": "paid" } },
      { $group: { _id: null, total: { $sum: "$pricing.grandTotal" } } }
    ]).toArray();

    const totalRevenue = revenueAgg[0]?.total || 0;

    // Get basic counts
    const [
      totalOrders,
      totalUsers,
      activeProducts,
      paidOrdersCount
    ] = await Promise.all([
      ordersCol.countDocuments(),
      usersCol.countDocuments(),
      productsCol.countDocuments(),
      ordersCol.countDocuments({ "payment.status": "paid" })
    ]);

    // Calculate monthly growth rate
    const now = new Date();

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);

    const [lastMonthAgg, prevMonthAgg] = await Promise.all([
      ordersCol.aggregate([
        {
          $match: {
            "payment.status": "paid",
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: "$pricing.grandTotal" } } }
      ]).toArray(),

      ordersCol.aggregate([
        {
          $match: {
            "payment.status": "paid",
            createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: "$pricing.grandTotal" } } }
      ]).toArray()
    ]);

    const lastMonthTotal = lastMonthAgg[0]?.total || 0;
    const prevMonthTotal = prevMonthAgg[0]?.total || 0;

    const growthRate =
      prevMonthTotal > 0
        ? ((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
        : 0;

    const growth = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}%`;

    // Revenue overview for last 6 months
    const revenueOverview = { months: [] as string[], values: [] as number[] };

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);

      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const agg = await ordersCol.aggregate([
        {
          $match: {
            "payment.status": "paid",
            createdAt: { $gte: start, $lte: end }
          }
        },
        { $group: { _id: null, total: { $sum: "$pricing.grandTotal" } } }
      ]).toArray();

      revenueOverview.months.push(monthNames[d.getMonth()]);
      revenueOverview.values.push(agg[0]?.total || 0);
    }

    // Product distribution by category
    const itemsAgg = await ordersCol.aggregate([
      { $match: { "payment.status": "paid" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          count: { $sum: "$items.quantity" }
        }
      }
    ]).toArray();

    const categoryCount = { "UI/UX": 0, "Web Dev": 0, "App Dev": 0 };

    itemsAgg.forEach(item => {
      const name = String(item._id).toLowerCase();
      if (name.includes("ui") || name.includes("ux") || name.includes("design")) {
        categoryCount["UI/UX"] += item.count;
      } else if (name.includes("app") || name.includes("mobile")) {
        categoryCount["App Dev"] += item.count;
      } else {
        categoryCount["Web Dev"] += item.count;
      }
    });

    const totalItems =
      categoryCount["UI/UX"] +
      categoryCount["Web Dev"] +
      categoryCount["App Dev"];

    const productDistribution = [
      {
        category: "UI/UX",
        percentage: totalItems ? Math.round((categoryCount["UI/UX"] / totalItems) * 100) : 35
      },
      {
        category: "Web Dev",
        percentage: totalItems ? Math.round((categoryCount["Web Dev"] / totalItems) * 100) : 40
      },
      {
        category: "App Dev",
        percentage: totalItems ? Math.round((categoryCount["App Dev"] / totalItems) * 100) : 25
      }
    ];

    // Orders overview for last 6 months
    const ordersOverview = { months: [] as string[], orders: [] as number[] };

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);

      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const count = await ordersCol.countDocuments({
        createdAt: { $gte: start, $lte: end }
      });

      ordersOverview.months.push(monthNames[d.getMonth()]);
      ordersOverview.orders.push(count);
    }

    // Get pricing plans
    const pricingPlans = await pricingCol.find().toArray();

    const pricingCount = pricingPlans.map(plan => ({
      name: plan.name || plan.title,
      price: plan.price,
      featureCount: Array.isArray(plan.features) ? plan.features.length : 0
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalRevenue: Math.round(totalRevenue),
        totalOrders,
        totalUsers,
        activeProducts,
        growth
      },
      revenueOverview,
      productDistribution,
      ordersOverview,
      paidOrders: {
        count: paidOrdersCount,
        status: "paid"
      },
      pricingPlans: pricingCount
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get dashboard statistics"
    });
  }
};
