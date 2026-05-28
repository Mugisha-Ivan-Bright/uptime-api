export const PLANS = {
  hobby: {
    maxMonitors: 3,
    minIntervalSeconds: 300,
    maxRegions: 1,
    alertChannels: ['email'],
    dataRetentionDays: 30,
    customDomain: false,
    apiAccess: false,
  },
  starter: {
    maxMonitors: 10,
    minIntervalSeconds: 60,
    maxRegions: 3,
    alertChannels: ['email', 'slack'],
    dataRetentionDays: 90,
    customDomain: false,
    apiAccess: true,
  },
  pro: {
    maxMonitors: 50,
    minIntervalSeconds: 30,
    maxRegions: 5,
    alertChannels: ['email', 'slack', 'pagerduty', 'webhook'],
    dataRetentionDays: 365,
    customDomain: true,
    apiAccess: true,
  },
  business: {
    maxMonitors: 999999,
    minIntervalSeconds: 30,
    maxRegions: 999999,
    alertChannels: ['email', 'slack', 'pagerduty', 'webhook'],
    dataRetentionDays: 365,
    customDomain: true,
    apiAccess: true,
  },
} as const

export type PlanName = keyof typeof PLANS
