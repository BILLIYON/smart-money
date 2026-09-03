import { google } from "googleapis";

export interface RealtimeAnalyticsData {
  activeUsers: number;
  activePages: Array<{ pagePath: string; activeUsers: number }>;
  countries: Array<{ country: string; activeUsers: number }>;
  devices: Array<{ deviceCategory: string; activeUsers: number }>;
  lastUpdated: string;
}

export interface ReportAnalyticsData {
  days: number;
  totalUsers: number;
  totalSessions: number;
  totalPageviews: number;
  bounceRate: number;
  dailyTrends: Array<{ date: string; users: number; sessions: number; pageviews: number }>;
  topPages: Array<{ pagePath: string; pageTitle: string; pageviews: number; users: number }>;
  trafficSources: Array<{ source: string; medium: string; sessions: number; users: number }>;
  countries: Array<{ country: string; users: number }>;
  devices: Array<{ deviceCategory: string; users: number }>;
}

function getPropertyId(): string {
  const rawId = process.env.GA_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID || "";
  // Strip any 'properties/' prefix if user entered it
  return rawId.replace(/^properties\//, "").trim();
}

async function getAuthenticatedClient() {
  const propertyId = getPropertyId();
  if (!propertyId) {
    throw new Error("GA_PROPERTY_ID is not configured in .env.local.");
  }

  // Method A: Google Cloud Service Account Credentials
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim();

  if (clientEmail && privateKey) {
    // Unescape newlines if encoded as literal '\n'
    privateKey = privateKey.replace(/\\n/g, "\n");
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });

    const analyticsData = google.analyticsdata({
      version: "v1beta",
      auth,
    });

    return { analyticsData, propertyId };
  }

  // Method B: Google OAuth2 Refresh Token
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const analyticsData = google.analyticsdata({
      version: "v1beta",
      auth: oauth2Client,
    });

    return { analyticsData, propertyId };
  }

  throw new Error(
    "Google Analytics credentials missing. Please set GA_PROPERTY_ID and either (GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY) or GOOGLE_REFRESH_TOKEN in .env.local."
  );
}

export async function fetchRealtimeAnalytics(): Promise<RealtimeAnalyticsData> {
  const { analyticsData, propertyId } = await getAuthenticatedClient();

  const response = await analyticsData.properties.runRealtimeReport({
    property: `properties/${propertyId}`,
    requestBody: {
      metrics: [{ name: "activeUsers" }],
      dimensions: [{ name: "unifiedScreenName" }, { name: "country" }, { name: "deviceCategory" }],
    },
  });

  const rows = response.data.rows || [];
  let activeUsers = 0;
  const pageMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();

  rows.forEach((row) => {
    const page = row.dimensionValues?.[0]?.value || "/";
    const country = row.dimensionValues?.[1]?.value || "Unknown";
    const device = row.dimensionValues?.[2]?.value || "desktop";
    const val = parseInt(row.metricValues?.[0]?.value || "0", 10);

    activeUsers += val;
    pageMap.set(page, (pageMap.get(page) || 0) + val);
    countryMap.set(country, (countryMap.get(country) || 0) + val);
    deviceMap.set(device, (deviceMap.get(device) || 0) + val);
  });

  return {
    activeUsers: Math.max(activeUsers, rows.length),
    activePages: Array.from(pageMap.entries()).map(([pagePath, count]) => ({ pagePath, activeUsers: count })),
    countries: Array.from(countryMap.entries()).map(([country, count]) => ({ country, activeUsers: count })),
    devices: Array.from(deviceMap.entries()).map(([deviceCategory, count]) => ({ deviceCategory, activeUsers: count })),
    lastUpdated: new Date().toISOString(),
  };
}

export async function fetchHistoricalAnalytics(days = 7): Promise<ReportAnalyticsData> {
  const { analyticsData, propertyId } = await getAuthenticatedClient();
  const startDate = `${days}daysAgo`;

  // Query 1: Daily Trends & Totals
  const mainReport = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate: "today" }],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
      ],
      dimensions: [{ name: "date" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    },
  });

  // Query 2: Top Pages
  const pagesReport = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate: "today" }],
      metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    },
  });

  // Query 3: Traffic Sources & Acquisition Channels
  const sourcesReport = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate: "today" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      limit: 8,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
  });

  // Query 4: Countries
  const geoReport = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate: "today" }],
      metrics: [{ name: "totalUsers" }],
      dimensions: [{ name: "country" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
    },
  });

  // Query 5: Devices
  const deviceReport = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate: "today" }],
      metrics: [{ name: "totalUsers" }],
      dimensions: [{ name: "deviceCategory" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
    },
  });

  const totals = mainReport.data.totals?.[0]?.metricValues || [];
  const totalUsers = parseInt(totals[0]?.value || "0", 10);
  const totalSessions = parseInt(totals[1]?.value || "0", 10);
  const totalPageviews = parseInt(totals[2]?.value || "0", 10);
  const bounceRate = parseFloat(totals[3]?.value || "0");

  const dailyTrends = (mainReport.data.rows || []).map((r) => {
    const rawDate = r.dimensionValues?.[0]?.value || "";
    // Format YYYYMMDD to YYYY-MM-DD
    const formattedDate = rawDate.length === 8 ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` : rawDate;
    return {
      date: formattedDate,
      users: parseInt(r.metricValues?.[0]?.value || "0", 10),
      sessions: parseInt(r.metricValues?.[1]?.value || "0", 10),
      pageviews: parseInt(r.metricValues?.[2]?.value || "0", 10),
    };
  });

  const topPages = (pagesReport.data.rows || []).map((r) => ({
    pagePath: r.dimensionValues?.[0]?.value || "/",
    pageTitle: r.dimensionValues?.[1]?.value || "Smart Money",
    pageviews: parseInt(r.metricValues?.[0]?.value || "0", 10),
    users: parseInt(r.metricValues?.[1]?.value || "0", 10),
  }));

  const trafficSources = (sourcesReport.data.rows || []).map((r) => ({
    source: r.dimensionValues?.[0]?.value || "(direct)",
    medium: r.dimensionValues?.[1]?.value || "(none)",
    sessions: parseInt(r.metricValues?.[0]?.value || "0", 10),
    users: parseInt(r.metricValues?.[1]?.value || "0", 10),
  }));

  const countries = (geoReport.data.rows || []).map((r) => ({
    country: r.dimensionValues?.[0]?.value || "Unknown",
    users: parseInt(r.metricValues?.[0]?.value || "0", 10),
  }));

  const devices = (deviceReport.data.rows || []).map((r) => ({
    deviceCategory: r.dimensionValues?.[0]?.value || "desktop",
    users: parseInt(r.metricValues?.[0]?.value || "0", 10),
  }));

  return {
    days,
    totalUsers,
    totalSessions,
    totalPageviews,
    bounceRate: Math.round(bounceRate * 100) / 100,
    dailyTrends,
    topPages,
    trafficSources,
    countries,
    devices,
  };
}
