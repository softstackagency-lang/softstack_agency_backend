import { Express } from 'express';

// Core routes
import adminRoutes from './adminRoutes';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import userRoutes from './userRoutes';
import dashboardRoutes from './dashboardRoutes';

// Module routes
import pricingRoutes from '../models/pricing/pricing.routes';
import productsRoutes from '../models/products/product.routes';
import projectsRoutes from '../models/projects/project.routes';
import servicesRoutes from '../models/services/service.routes';
import teamRoutes from '../models/team/team.routes';
import userManagementRoutes from '../models/user/user.routes';
import orderRoutes from '../models/order/order.routes';
import contactRoutes from '../models/contact/contact.routes';

// Home module routes
import bannerRoutes from '../models/Home/Banner/banner.routes';
import testimonialRoutes from '../models/Home/Testimonials/testimonial.routes';
import faqRoutes from '../models/Home/FAQ/faq.routes';

export const registerRoutes = (app: Express) => {
  // Core routes
  app.use('/api', adminRoutes);
  app.use('/api', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // User management
  app.use('/api/users', userManagementRoutes);

  // Products & orders
  app.use('/api/products', productRoutes);
  app.use('/api/products-module', productsRoutes);
  app.use('/api/orders', orderRoutes);

  // Pricing
  app.use('/api/pricing', pricingRoutes);

  // Portfolio & services
  app.use('/api/projects', projectsRoutes);
  app.use('/api/services', servicesRoutes);

  // Team
  app.use('/api/team', teamRoutes);

  // Home page
  app.use('/api/banner', bannerRoutes);
  app.use('/api/testimonials', testimonialRoutes);
  app.use('/api/faqs', faqRoutes);

  // Contact
  app.use('/api/contact', contactRoutes);
};
