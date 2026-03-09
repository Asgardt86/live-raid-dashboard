export default async function handler(req, res) {

  try {

    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;

    const credentials = btoa(`${clientId}:${clientSecret}`);

    const tokenResponse = await fetch("https://www.warcraftlogs.com/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    const tokenData = await tokenResponse.json();

    res.status(200).json({
      tokenData
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
