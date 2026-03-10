export default async function handler(req, res) {

  try {

    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;

    const credentials = Buffer
      .from(`${clientId}:${clientSecret}`)
      .toString("base64");

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

    /* =========================
       LETZTEN REPORT LADEN
    ========================= */

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
              startTime
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
    const report = reportsData?.data?.reportData?.reports?.data?.[0];

    if (!report) {
      return res.status(200).json({ live:false });
    }

    const reportCode = report.code;
    const reportStart = report.startTime;

    /* =========================
       FIGHTS LADEN
    ========================= */

    const fightsQuery = `
      {
        reportData {
          report(code: "${reportCode}") {
            fights {
              name
              zoneID
              bossPercentage
              kill
              difficulty
              startTime
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
    const fights = fightsData?.data?.reportData?.report?.fights || [];

    const pulls = fights.filter(f => f.bossPercentage !== null);

    if (pulls.length === 0) {
      return res.status(200).json({ live:false });
    }

/* =========================
   ZEITEN BERECHNEN
========================= */

const firstPull = pulls[0];
const lastPull = pulls[pulls.length - 1];

const now = Date.now();

const firstPullTime = reportStart + firstPull.startTime;
const lastPullTime = reportStart + (lastPull.startTime || 0);

const minutesSinceLastPull =
  (now - lastPullTime) / 1000 / 60;

const reportAgeMinutes =
  (now - reportStart) / 1000 / 60;

/*
Live Raid wenn:
letzter Pull < 20 Minuten
*/
const raidStillActive = minutesSinceLastPull < 20;

/*
Summary wenn:
letzter Pull > 20 Minuten
Report jünger als 10 Stunden
*/
const summaryActive =
  minutesSinceLastPull >= 20 &&
  reportAgeMinutes < 600;

    /* =========================
       DIFFICULTY
    ========================= */

    const difficultyMap = {
      3: "Normal",
      4: "Heroic",
      5: "Mythic"
    };

    const currentBoss = lastPull.name;

    const difficulty =
      difficultyMap[lastPull.difficulty] || "";

    /* =========================
       BOSS PULLS
    ========================= */

    const bossPulls = pulls.filter(p =>
      p.name === currentBoss &&
      p.difficulty === lastPull.difficulty
    );

    const totalPulls = bossPulls.length;

    let best = 100;
    const timeline = [];

    bossPulls.forEach((pull,index)=>{

      const percent = pull.kill ? 0 : pull.bossPercentage;

      if(percent < best){

        best = percent;

        timeline.push({
          pull:index + 1,
          percent:percent.toFixed(2)
        });

      }

    });

    /* =========================
       RAID DAUER
    ========================= */

    let raidDurationMs;

    if(raidStillActive){
      raidDurationMs = now - firstPullTime;
    }else{
      raidDurationMs = lastPullTime - firstPullTime;
    }

    const hours =
      Math.floor(raidDurationMs / (1000 * 60 * 60));

    const minutes =
      Math.floor(
        (raidDurationMs % (1000 * 60 * 60))
        / (1000 * 60)
      );

    const raidDuration = `${hours}h ${minutes}m`;

    /* =========================
       RAID SUMMARY
    ========================= */

    const raidStats = {};

    fights.forEach(fight => {

      if(fight.bossPercentage === null && !fight.kill)
        return;

      const diff =
        difficultyMap[fight.difficulty] || "Unknown";

      if(!raidStats[diff])
        raidStats[diff] = {
          kills:0,
          pulls:0
        };

      if(fight.bossPercentage !== null)
        raidStats[diff].pulls++;

      if(fight.kill)
        raidStats[diff].kills++;

    });

    /* =========================
       LIVE RAID
    ========================= */

    if(raidStillActive){

      return res.status(200).json({

        live:true,
        boss:currentBoss,
        difficulty:difficulty,
        report:reportCode,
        raidDuration:raidDuration,
        totalPulls:totalPulls,
        bestPull:best.toFixed(2),
        kill:lastPull.kill || false,
        timeline:timeline

      });

    }

    /* =========================
       RAID SUMMARY
    ========================= */

    if(summaryActive){

      return res.status(200).json({

        live:false,
        summary:true,
        raidDuration:raidDuration,
        report:reportCode,
        raidStats:raidStats

      });

    }

    return res.status(200).json({
      live:false
    });

  }

  catch(error){

    res.status(500).json({
      error:error.message
    });

  }

}
