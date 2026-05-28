import Stripe from "stripe"
import type { PrismaClient } from "@uptime/db"
import { env } from "../config/env.js"
import { PLANS } from "../config/plans.js"
import { AppError, ErrorCodes } from "../lib/errors.js"
import crypto from "crypto"

// Initialize Stripe client
export const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
})

export async function createCheckoutSession(
  orgId: string,
  plan: "starter" | "pro" | "business",
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const lookupKey = `uptime_${plan}_monthly`
  
  // First, check if the price exists by trying to retrieve it
  // In a real implementation, you might want to handle this differently
  // For now, we'll proceed and let Stripe handle invalid lookup keys
  
  const session = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price_lookup_key: lookupKey,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      orgId,
    },
  })
  
  if (!session.url) {
    throw new AppError("Failed to create checkout session", 500, "INTERNAL_ERROR", ErrorCodes.INTERNAL)
  }
  
  return session.url
}

export async function createCustomerPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripeClient.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  })
  
  return session.url
}

export async function handleWebhookEvent(
  prisma: PrismaClient,
  rawBody: Buffer,
  signature: string
): Promise<void> {
  let event: Stripe.Event
  
  try {
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err}`)
    // We don't throw an error here because we don't want to retry
    // Stripe will retry until we acknowledge receipt
    return
  }
  
  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.orgId
      
      if (!orgId) {
        console.error("No orgId found in checkout session metadata")
        return
      }
      
      // Get the subscription to determine the plan
      const subscriptionId = session.subscription as string
      const subscription = await stripeClient.subscriptions.retrieve(subscriptionId)
      
      // Map Stripe price lookup keys to our plan names
      let plan: string = "hobby" // default fallback
      const price = subscription.items.data[0]?.price
      if (price?.lookup_key) {
        switch (price.lookup_key) {
          case "uptime_starter_monthly":
            plan = "starter"
            break
          case "uptime_pro_monthly":
            plan = "pro"
            break
          case "uptime_business_monthly":
            plan = "business"
            break
        }
      }
      
      // Update or create subscription record
      await prisma.subscription.upsert({
        where: { orgId },
        update: {
          stripeCustomerId: session.customer as string,
          stripeSubId: subscriptionId,
          plan,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        create: {
          id: crypto.randomUUID(),
          orgId,
          stripeCustomerId: session.customer as string,
          stripeSubId: subscriptionId,
          plan,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
      
      // Update organization plan
      await prisma.organization.update({
        where: { id: orgId },
        data: { 
          plan,
          stripeCustomerId: session.customer as string,
        },
      })
      
      break
    }
    
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      
      // Find our subscription record by stripeSubId
      const dbSubscription = await prisma.subscription.findUnique({
        where: { stripeSubId: subscription.id },
      })
      
      if (!dbSubscription) {
        console.error(`Subscription not found for stripeSubId: ${subscription.id}`)
        return
      }
      
      // Map price to plan
      let plan: string = dbSubscription.plan // keep existing if we can't determine
      const price = subscription.items.data[0]?.price
      if (price?.lookup_key) {
        switch (price.lookup_key) {
          case "uptime_starter_monthly":
            plan = "starter"
            break
          case "uptime_pro_monthly":
            plan = "pro"
            break
          case "uptime_business_monthly":
            plan = "business"
            break
        }
      }
      
      // Update subscription
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          plan,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
      
      // Update organization plan
      await prisma.organization.update({
        where: { id: dbSubscription.orgId },
        data: { plan },
      })
      
      break
    }
    
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      
      // Find our subscription record by stripeSubId
      const dbSubscription = await prisma.subscription.findUnique({
        where: { stripeSubId: subscription.id },
      })
      
      if (!dbSubscription) {
        console.error(`Subscription not found for stripeSubId: ${subscription.id}`)
        return
      }
      
      // Update subscription status to canceled
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: "canceled",
        },
      })
      
      // Downgrade organization to hobby plan
      await prisma.organization.update({
        where: { id: dbSubscription.orgId },
        data: { 
          plan: "hobby",
        },
      })
      
      break
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}