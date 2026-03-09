export default async function handler(req, res) {

  try {

    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;

    const credentials = Buffer
      .from(`${clientId}:${clientSecret}`)
      .toString("base64");

    // OAuth Token holen
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

    // neuesten Report der Gilde holen
    const reportsQuery = `
      {
        reportData {
          reports(
            guildName: "We Pull at Two",
            guildServerSlug: "blackrock",
            guildServerRegion: "eu",
            limit: 1
          ) {
            data {
              code
              title
              startTime
              endTime
            }
          }
        }
      }
    `;

    const reportsResponse = await fetch(
      "https://www.warcraftlogs.com/api/v2/client",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: reportsQuery })
      }
    );

    const reportsData = await reportsResponse.json();

    const reportCode =
      reportsData.data.reportData.reports.data[0].code;

    // Fight Daten laden
    const fightsQuery = `
      {
        reportData {
          report(code: "${reportCode}") {
            fights {
              id
              name
              bossPercentage
              kill
            }
          }
        }
      }
    `;

    const fightsResponse = await fetch(
      "https://www.warcraftlogs.com/api/v2/client",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: fightsQuery })
      }
    );

    const fightsData = await fightsResponse.json();

    res.status(200).json({
      report: reportCode,
      fights: fightsData.data.reportData.report.fights
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
