// payments.ts - Payment Processing API Routes
// Handles Stripe and PayPal payments, subscriptions, and webhooks

import express from 'express';
import { paymentService } from '../../payments/PaymentService';
import { authenticateToken } from './auth';
import { createLogger } from '../../utils/logger';

const router = express.Router();
const logger = createLogger('PaymentRoutes');

/**
 * GET /api/payments/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = paymentService.getPlans();
    
    res.json({
      success: true,
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features,
        maxApiServices: plan.maxApiServices,
        maxUsers: plan.maxUsers
      }))
    });
  } catch (error: any) {
    logger.error('❌ Get plans failed:', error);
    res.status(500).json({
      error: error.message || 'Failed to get plans',
      code: 'GET_PLANS_FAILED'
    });
  }
});

/**
 * POST /api/payments/stripe/create-payment-intent
 * Create Stripe payment intent for subscription
 */
router.post('/stripe/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    const user = (req as any).user;

    if (!planId) {
      return res.status(400).json({
        error: 'Plan ID is required'
      });
    }

    const plan = paymentService.getPlanById(planId);
    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found'
      });
    }

    if (plan.price === 0) {
      return res.status(400).json({
        error: 'Cannot create payment intent for free plan'
      });
    }

    const paymentIntent = await paymentService.createStripePaymentIntent(user.id, planId);

    logger.info(`✅ Created Stripe payment intent for user: ${user.email}, plan: ${planId}`);

    res.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.clientSecret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      },
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency
      }
    });
  } catch (error: any) {
    logger.error('❌ Create Stripe payment intent failed:', error);
    res.status(400).json({
      error: error.message || 'Failed to create payment intent',
      code: 'STRIPE_PAYMENT_INTENT_FAILED'
    });
  }
});

/**
 * POST /api/payments/paypal/create-payment
 * Create PayPal payment for subscription
 */
router.post('/paypal/create-payment', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;
    const user = (req as any).user;

    if (!planId) {
      return res.status(400).json({
        error: 'Plan ID is required'
      });
    }

    const plan = paymentService.getPlanById(planId);
    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found'
      });
    }

    if (plan.price === 0) {
      return res.status(400).json({
        error: 'Cannot create PayPal payment for free plan'
      });
    }

    const payment = await paymentService.createPayPalPayment(user.id, planId);

    logger.info(`✅ Created PayPal payment for user: ${user.email}, plan: ${planId}`);

    res.json({
      success: true,
      payment: {
        id: payment.paymentId,
        approvalUrl: payment.approvalUrl
      },
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency
      }
    });
  } catch (error: any) {
    logger.error('❌ Create PayPal payment failed:', error);
    res.status(400).json({
      error: error.message || 'Failed to create PayPal payment',
      code: 'PAYPAL_PAYMENT_FAILED'
    });
  }
});

/**
 * POST /api/payments/confirm-payment
 * Confirm payment and create subscription
 */
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId, planId } = req.body;
    const user = (req as any).user;

    if (!paymentIntentId || !planId) {
      return res.status(400).json({
        error: 'Payment intent ID and plan ID are required'
      });
    }

    const subscription = await paymentService.confirmPayment(paymentIntentId, user.id, planId);

    logger.info(`✅ Payment confirmed and subscription created: ${subscription.id}`);

    res.json({
      success: true,
      message: 'Payment confirmed and subscription activated',
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        amount: subscription.amount,
        currency: subscription.currency
      }
    });
  } catch (error: any) {
    logger.error('❌ Confirm payment failed:', error);
    res.status(400).json({
      error: error.message || 'Failed to confirm payment',
      code: 'PAYMENT_CONFIRMATION_FAILED'
    });
  }
});

/**
 * GET /api/payments/subscription
 * Get user's current subscription
 */
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const subscription = await paymentService.getUserSubscription(user.id);

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        message: 'No active subscription found'
      });
    }

    const plan = paymentService.getPlanById(subscription.planId);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        planName: plan?.name,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        paymentMethod: subscription.paymentMethod,
        amount: subscription.amount,
        currency: subscription.currency
      }
    });
  } catch (error: any) {
    logger.error('❌ Get subscription failed:', error);
    res.status(500).json({
      error: error.message || 'Failed to get subscription',
      code: 'GET_SUBSCRIPTION_FAILED'
    });
  }
});

/**
 * POST /api/payments/subscription/cancel
 * Cancel user's subscription
 */
router.post('/subscription/cancel', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const subscription = await paymentService.getUserSubscription(user.id);

    if (!subscription) {
      return res.status(404).json({
        error: 'No active subscription found'
      });
    }

    const canceledSubscription = await paymentService.cancelSubscription(subscription.id);

    logger.info(`✅ Subscription canceled: ${subscription.id} for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Subscription canceled successfully',
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        currentPeriodEnd: canceledSubscription.currentPeriodEnd
      }
    });
  } catch (error: any) {
    logger.error('❌ Cancel subscription failed:', error);
    res.status(400).json({
      error: error.message || 'Failed to cancel subscription',
      code: 'CANCEL_SUBSCRIPTION_FAILED'
    });
  }
});

/**
 * POST /api/payments/upgrade-to-starter
 * Upgrade user to starter plan (free)
 */
router.post('/upgrade-to-starter', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    // For free starter plan, just update the user subscription directly
    const updatedUser = await paymentService.confirmPayment('demo_payment_intent', user.id, 'starter');

    logger.info(`✅ User upgraded to starter plan: ${user.email}`);

    res.json({
      success: true,
      message: 'Successfully upgraded to Starter plan',
      subscription: {
        planId: 'starter',
        status: 'trial',
        message: 'Welcome to APIHarvester! You now have access to 5 API services.'
      }
    });
  } catch (error: any) {
    logger.error('❌ Upgrade to starter failed:', error);
    res.status(400).json({
      error: error.message || 'Failed to upgrade to starter plan',
      code: 'STARTER_UPGRADE_FAILED'
    });
  }
});

/**
 * GET /api/payments/analytics
 * Get subscription analytics (admin only)
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    // Simple admin check (in production, use proper role-based access)
    if (user.email !== 'admin@apiharvester.com') {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    const analytics = await paymentService.getSubscriptionAnalytics();

    res.json({
      success: true,
      analytics
    });
  } catch (error: any) {
    logger.error('❌ Get analytics failed:', error);
    res.status(500).json({
      error: error.message || 'Failed to get analytics',
      code: 'ANALYTICS_FAILED'
    });
  }
});

/**
 * POST /api/payments/webhooks/stripe
 * Handle Stripe webhooks
 */
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = req.body;

    // In production, verify webhook signature
    // const signature = req.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    await paymentService.handleStripeWebhook(event);

    logger.info(`✅ Stripe webhook processed: ${event.type}`);

    res.json({ received: true });
  } catch (error: any) {
    logger.error('❌ Stripe webhook failed:', error);
    res.status(400).json({
      error: error.message || 'Webhook processing failed'
    });
  }
});

/**
 * POST /api/payments/webhooks/paypal
 * Handle PayPal webhooks
 */
router.post('/webhooks/paypal', async (req, res) => {
  try {
    const event = req.body;

    // In production, verify webhook signature
    await paymentService.handlePayPalWebhook(event);

    logger.info(`✅ PayPal webhook processed: ${event.event_type}`);

    res.json({ received: true });
  } catch (error: any) {
    logger.error('❌ PayPal webhook failed:', error);
    res.status(400).json({
      error: error.message || 'Webhook processing failed'
    });
  }
});

export default router; 