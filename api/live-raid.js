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

const fights = fightsData.data.reportData.report.fights;

// nur echte Boss Pulls
const pulls = fights.filter(f => f.bossPercentage !== null);

// Pull Counter
const totalPulls = pulls.length;

// Best Pull
let best = 100;

// Progress Timeline
const timeline = [];

pulls.forEach((pull, index) => {

  const percent = pull.bossPercentage;

  if (percent < best) {

    best = percent;

    timeline.push({
      pull: index + 1,
      percent: percent.toFixed(2),
      boss: pull.name
    });

  }

});

res.status(200).json({
  report: reportCode,
  boss: pulls[0]?.name,
  totalPulls: totalPulls,
  bestPull: best.toFixed(2),
  timeline: timeline
});

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
