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


    // GraphQL Query
    const query = `
      {
        reportData {
          reports(guildName: "We Pull at Two", guildServerSlug: "blackrock", guildServerRegion: "eu", limit: 5) {
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
        body: JSON.stringify({ query })
      }
    );

    const reportsData = await reportsResponse.json();

    res.status(200).json(reportsData);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
