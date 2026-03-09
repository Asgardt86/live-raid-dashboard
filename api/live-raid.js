export default async function handler(req, res) {

  try {

    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;

    // OAuth Token holen
    const tokenResponse = await fetch("https://www.warcraftlogs.com/oauth/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

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

    if (!reports || reports.length === 0) {
      return res.status(200).json({ active: false });
    }


    // neuesten Report auswählen
    const latest = reports[0];

    res.status(200).json({
      active: true,
      report: latest.id,
      title: latest.title,
      start: latest.start,
      end: latest.end
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
