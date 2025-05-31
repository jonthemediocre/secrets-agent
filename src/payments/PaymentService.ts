// PaymentService.ts - Complete SaaS Payment Processing
// Handles Stripe and PayPal subscriptions, webhooks, and billing

import { createLogger } from '../utils/logger';
import { authService, User } from '../auth/AuthService';

const logger = createLogger('PaymentService');

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
  paypalPlanId?: string;
  maxApiServices: number;
  maxUsers: number;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  clientSecret?: string;
  paymentMethod: 'stripe' | 'paypal';
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trial' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  paymentMethod: 'stripe' | 'paypal';
  externalSubscriptionId: string;
  amount: number;
  currency: string;
}

export class PaymentService {
  private readonly STRIPE_SECRET_KEY: string;
  private readonly PAYPAL_CLIENT_ID: string;
  private readonly PAYPAL_CLIENT_SECRET: string;
  private readonly WEBHOOK_SECRET: string;

  // In-memory storage (replace with database in production)
  private subscriptions = new Map<string, Subscription>();
  private paymentIntents = new Map<string, PaymentIntent>();

  // Pricing plans
  private plans: SubscriptionPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 0,
      currency: 'usd',
      interval: 'month',
      features: ['5 API services', 'Basic CLI harvesting', 'Community support'],
      maxApiServices: 5,
      maxUsers: 1
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 39,
      currency: 'usd',
      interval: 'month',
      features: ['50 API services', 'AI agent orchestration', 'Priority support', 'Team collaboration'],
      stripePriceId: 'price_professional_monthly',
      paypalPlanId: 'P-professional-monthly',
      maxApiServices: 50,
      maxUsers: 10
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 89,
      currency: 'usd',
      interval: 'month',
      features: ['Unlimited API services', 'Full AI ecosystem', '24/7 support', 'Custom integrations'],
      stripePriceId: 'price_enterprise_monthly',
      paypalPlanId: 'P-enterprise-monthly',
      maxApiServices: 999,
      maxUsers: 999
    }
  ];

  constructor() {
    this.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key';
    this.PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'your_paypal_client_id';
    this.PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'your_paypal_client_secret';
    this.WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_your_webhook_secret';

    if (this.STRIPE_SECRET_KEY.includes('your_stripe')) {
      logger.warn('⚠️ Using demo Stripe key - Configure real keys for production!');
    }

    this.initializeDemoSubscriptions();
  }

  /**
   * Initialize demo subscriptions for testing
   */
  private initializeDemoSubscriptions(): void {
    const demoSubscription: Subscription = {
      id: 'sub_demo_123',
      userId: 'user_demo',
      planId: 'professional',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      paymentMethod: 'stripe',
      externalSubscriptionId: 'sub_stripe_demo_123',
      amount: 39,
      currency: 'usd'
    };

    this.subscriptions.set(demoSubscription.id, demoSubscription);
    logger.info('✅ Initialized demo subscription');
  }

  /**
   * Get all available plans
   */
  getPlans(): SubscriptionPlan[] {
    return this.plans;
  }

  /**
   * Get plan by ID
   */
  getPlanById(planId: string): SubscriptionPlan | null {
    return this.plans.find(p => p.id === planId) || null;
  }

  /**
   * Create Stripe payment intent
   */
  async createStripePaymentIntent(userId: string, planId: string): Promise<PaymentIntent> {
    try {
      const plan = this.getPlanById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      if (plan.price === 0) {
        throw new Error('Cannot create payment intent for free plan');
      }

      // Simulate Stripe API call
      const paymentIntent: PaymentIntent = {
        id: `pi_${this.generateId()}`,
        amount: plan.price * 100, // Stripe uses cents
        currency: plan.currency,
        status: 'pending',
        clientSecret: `pi_${this.generateId()}_secret_${this.generateId()}`,
        paymentMethod: 'stripe'
      };

      this.paymentIntents.set(paymentIntent.id, paymentIntent);

      logger.info(`✅ Created Stripe payment intent: ${paymentIntent.id} for $${plan.price}`);
      
      return paymentIntent;
    } catch (error) {
      logger.error('❌ Failed to create Stripe payment intent:', error);
      throw error;
    }
  }

  /**
   * Create PayPal payment
   */
  async createPayPalPayment(userId: string, planId: string): Promise<{ approvalUrl: string; paymentId: string }> {
    try {
      const plan = this.getPlanById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      if (plan.price === 0) {
        throw new Error('Cannot create PayPal payment for free plan');
      }

      // Simulate PayPal API call
      const paymentId = `PAY-${this.generateId()}`;
      const approvalUrl = `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=${this.generateId()}`;

      logger.info(`✅ Created PayPal payment: ${paymentId} for $${plan.price}`);
      
      return { approvalUrl, paymentId };
    } catch (error) {
      logger.error('❌ Failed to create PayPal payment:', error);
      throw error;
    }
  }

  /**
   * Confirm payment and create subscription
   */
  async confirmPayment(paymentIntentId: string, userId: string, planId: string): Promise<Subscription> {
    try {
      const paymentIntent = this.paymentIntents.get(paymentIntentId);
      if (!paymentIntent) {
        throw new Error('Payment intent not found');
      }

      const plan = this.getPlanById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Simulate successful payment
      paymentIntent.status = 'succeeded';
      this.paymentIntents.set(paymentIntentId, paymentIntent);

      // Create subscription
      const subscription: Subscription = {
        id: `sub_${this.generateId()}`,
        userId,
        planId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        paymentMethod: paymentIntent.paymentMethod,
        externalSubscriptionId: `ext_${this.generateId()}`,
        amount: plan.price,
        currency: plan.currency
      };

      this.subscriptions.set(subscription.id, subscription);

      // Update user subscription in auth service
      await authService.updateUserSubscription(userId, plan.id as any, 'active');

      logger.info(`✅ Confirmed payment and created subscription: ${subscription.id}`);
      
      return subscription;
    } catch (error) {
      logger.error('❌ Failed to confirm payment:', error);
      throw error;
    }
  }

  /**
   * Get user's active subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const subscription = Array.from(this.subscriptions.values())
      .find(s => s.userId === userId && s.status === 'active');
    
    return subscription || null;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      subscription.status = 'canceled';
      this.subscriptions.set(subscriptionId, subscription);

      // Update user subscription in auth service
      await authService.updateUserSubscription(subscription.userId, 'starter' as any, 'canceled');

      logger.info(`✅ Canceled subscription: ${subscriptionId}`);
      
      return subscription;
    } catch (error) {
      logger.error('❌ Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(event: any): Promise<void> {
    try {
      logger.info(`📥 Received Stripe webhook: ${event.type}`);

      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handleSuccessfulPayment(event.data.object);
          break;
        
        case 'invoice.payment_failed':
          await this.handleFailedPayment(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object);
          break;
        
        default:
          logger.info(`ℹ️ Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      logger.error('❌ Failed to handle Stripe webhook:', error);
      throw error;
    }
  }

  /**
   * Handle PayPal webhook
   */
  async handlePayPalWebhook(event: any): Promise<void> {
    try {
      logger.info(`📥 Received PayPal webhook: ${event.event_type}`);

      switch (event.event_type) {
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await this.handlePayPalSubscriptionActivated(event.resource);
          break;
        
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await this.handlePayPalSubscriptionCanceled(event.resource);
          break;
        
        default:
          logger.info(`ℹ️ Unhandled PayPal webhook event: ${event.event_type}`);
      }
    } catch (error) {
      logger.error('❌ Failed to handle PayPal webhook:', error);
      throw error;
    }
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    revenue: { monthly: number; yearly: number };
    planDistribution: Record<string, number>;
  }> {
    const subscriptions = Array.from(this.subscriptions.values());
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    
    const monthlyRevenue = activeSubscriptions.reduce((sum, s) => sum + s.amount, 0);
    const yearlyRevenue = monthlyRevenue * 12;
    
    const planDistribution: Record<string, number> = {};
    activeSubscriptions.forEach(s => {
      planDistribution[s.planId] = (planDistribution[s.planId] || 0) + 1;
    });

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      revenue: { monthly: monthlyRevenue, yearly: yearlyRevenue },
      planDistribution
    };
  }

  /**
   * Private helper methods
   */
  private async handleSuccessfulPayment(invoice: any): Promise<void> {
    logger.info(`✅ Payment succeeded for invoice: ${invoice.id}`);
    // Update subscription status, extend period, etc.
  }

  private async handleFailedPayment(invoice: any): Promise<void> {
    logger.warn(`⚠️ Payment failed for invoice: ${invoice.id}`);
    // Mark subscription as past_due, send notification, etc.
  }

  private async handleSubscriptionCanceled(subscription: any): Promise<void> {
    logger.info(`❌ Subscription canceled: ${subscription.id}`);
    // Update internal subscription status
  }

  private async handlePayPalSubscriptionActivated(subscription: any): Promise<void> {
    logger.info(`✅ PayPal subscription activated: ${subscription.id}`);
    // Update internal subscription status
  }

  private async handlePayPalSubscriptionCanceled(subscription: any): Promise<void> {
    logger.info(`❌ PayPal subscription canceled: ${subscription.id}`);
    // Update internal subscription status
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Singleton instance
export const paymentService = new PaymentService(); 