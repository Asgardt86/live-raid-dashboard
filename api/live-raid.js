export default async function handler(req, res) {

  try {

    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;

    const credentials = Buffer
      .from(`${clientId}:${clientSecret}`)
      .toString("base64");

    // Token holen
    const tokenResponse = await fetch(
      "https://www.warcraftlogs.com/oauth/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Guild Reports abrufen
    const reportsResponse = await fetch(
      "https://www.warcraftlogs.com/v1/reports/guild/We%20Pull%20at%20Two/Blackrock/eu",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const reports = await reportsResponse.json();

    res.status(200).json({
      totalReports: reports.length,
      latestReport: reports[0]
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
